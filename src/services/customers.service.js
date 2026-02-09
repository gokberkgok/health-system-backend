// Customer service - Business logic for customers
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import { validateTcIdentity, validatePhone, validateBirthDate } from '../utils/validators.js';

export class CustomerService {
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }

    /**
     * Validate customer data
     */
    validateCustomerData(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate && !data.fullName?.trim()) {
            errors.push('Full name is required');
        }

        if (data.tcIdentity && !validateTcIdentity(data.tcIdentity)) {
            errors.push('Invalid TC identity number');
        }

        if (data.phone && !validatePhone(data.phone)) {
            errors.push('Invalid phone number format');
        }

        if (data.birthDate && !validateBirthDate(data.birthDate)) {
            errors.push('Birth date cannot be in the future');
        }

        if (data.heightCm && (data.heightCm < 50 || data.heightCm > 250)) {
            errors.push('Height must be between 50 and 250 cm');
        }

        if (data.gender && !['male', 'female'].includes(data.gender)) {
            errors.push('Gender must be male or female');
        }

        if (errors.length > 0) {
            throw new ValidationError('Invalid customer data', errors);
        }
    }

    /**
     * Get all customers for a company with pagination
     */
    async getAll(companyId, options = {}) {
        const result = await this.customerRepository.findMany(companyId, options);

        return {
            data: result.customers.map(this.formatCustomer),
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        };
    }

    /**
     * Get single customer by ID
     */
    async getById(id, companyId) {
        const customer = await this.customerRepository.findById(id, companyId);
        if (!customer) {
            throw new NotFoundError('Customer');
        }
        return this.formatCustomer(customer);
    }

    /**
     * Create new customer
     */
    async create(companyId, data) {
        this.validateCustomerData(data);

        // Check for duplicate TC identity
        if (data.tcIdentity) {
            const existing = await this.customerRepository.findByTcIdentity(data.tcIdentity, companyId);
            if (existing) {
                throw new ConflictError('Error!');
            }
        }

        const customer = await this.customerRepository.create(companyId, data);
        return this.formatCustomer(customer);
    }

    /**
     * Update customer
     */
    async update(id, companyId, data) {
        this.validateCustomerData(data, true);

        // Check if TC identity is already in use by another customer
        if (data.tcIdentity) {
            const existing = await this.customerRepository.findByTcIdentity(data.tcIdentity, companyId);
            if (existing && existing.id !== id) {
                throw new ValidationError('Bu TC Kimlik numarası başka bir müşteri tarafından kullanılıyor');
            }
        }

        const customer = await this.customerRepository.update(id, companyId, data);
        if (!customer) {
            throw new NotFoundError('Customer');
        }
        return this.formatCustomer(customer);
    }

    /**
     * Soft delete customer
     */
    async delete(id, companyId) {
        const customer = await this.customerRepository.softDelete(id, companyId);
        if (!customer) {
            throw new NotFoundError('Customer');
        }
        return true;
    }

    /**
     * Get customer statistics
     */
    async getStats(companyId) {
        const [total, genderStats] = await Promise.all([
            this.customerRepository.count(companyId),
            this.customerRepository.getGenderStats(companyId),
        ]);

        return {
            total,
            byGender: genderStats,
        };
    }

    /**
     * Format customer for API response
     */
    formatCustomer(customer) {
        return {
            id: customer.id.toString(),
            fullName: customer.fullName,
            tcIdentity: customer.tcIdentity,
            birthDate: customer.birthDate?.toISOString().split('T')[0],
            age: customer.birthDate
                ? Math.floor((Date.now() - customer.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                : null,
            gender: customer.gender,
            heightCm: customer.heightCm,
            phone: customer.phone,
            notes: customer.notes,
            isActive: customer.isActive,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: customer.updatedAt?.toISOString(),
            totalDebt: typeof customer.totalDebt !== 'undefined' ? parseFloat(customer.totalDebt) : 0,
        };
    }

    // ==================== MESSAGE GENERATION METHODS ====================

    /**
     * Set dependencies for message generation
     */
    setMessageDependencies(appointmentRepository, paymentRepository) {
        this.appointmentRepository = appointmentRepository;
        this.paymentRepository = paymentRepository;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    formatDayName(date) {
        return new Date(date).toLocaleDateString('tr-TR', { weekday: 'long' });
    }

    /**
     * Get appointment message for customer (for copying)
     */
    async getAppointmentMessage(customerId, companyId) {
        const customer = await this.customerRepository.findById(customerId, companyId);
        if (!customer) throw new NotFoundError('Customer');

        const now = new Date();
        const appointments = await this.appointmentRepository.findByCustomerId(customerId, companyId);

        console.log('[DEBUG] getAppointmentMessage:', {
            customerId,
            totalAppointments: appointments.length,
            appointmentStatuses: appointments.map(a => ({ id: a.id, status: a.status, startTime: a.startTime }))
        });

        // Group appointments by status and time
        const upcomingScheduled = appointments
            .filter(apt => apt.status === 'scheduled' && new Date(apt.startTime) >= now)
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

        const pastScheduled = appointments
            .filter(apt => apt.status === 'scheduled' && new Date(apt.startTime) < now)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 5); // Last 5 past scheduled

        const completed = appointments
            .filter(apt => apt.status === 'completed')
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 5); // Last 5 completed

        const cancelled = appointments
            .filter(apt => apt.status === 'cancelled')
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 3); // Last 3 cancelled

        console.log('[DEBUG] Filtered appointments:', {
            upcomingScheduled: upcomingScheduled.length,
            pastScheduled: pastScheduled.length,
            completed: completed.length,
            cancelled: cancelled.length
        });

        let message = `Merhaba ${customer.fullName},\n\n`;

        // Upcoming scheduled appointments
        if (upcomingScheduled.length > 0) {
            message += ` *Planlanmış Randevular:*\n`;
            for (const apt of upcomingScheduled) {
                const day = this.formatDayName(apt.startTime);
                const time = this.formatTime(apt.startTime);
                const date = this.formatDate(apt.startTime);
                const devices = apt.devices?.map(d => d.deviceName).join(', ') || '';
                message += `   • ${day}, ${time} (${date})\n`;
                if (devices) message += `     Cihazlar: ${devices}\n`;
            }
            message += `\n`;
        }

        // Past scheduled appointments (not completed/cancelled)
        if (pastScheduled.length > 0) {
            message += ` *Geçmiş Randevular (Zamanı Geçmiş):*\n`;
            for (const apt of pastScheduled) {
                const date = this.formatDate(apt.startTime);
                const time = this.formatTime(apt.startTime);
                const devices = apt.devices?.map(d => d.deviceName).join(', ') || '';
                message += `   • ${date} - ${time}\n`;
                if (devices) message += `     Cihazlar: ${devices}\n`;
            }
            message += `\n`;
        }

        // If no upcoming appointments
        if (upcomingScheduled.length === 0 && pastScheduled.length === 0) {
            message += ` Şu an için planlanmış randevunuz bulunmamaktadır.\n\n`;
        }

        // Completed appointments
        if (completed.length > 0) {
            message += `*Tamamlanan Randevular (Son ${completed.length}):*\n`;
            for (const apt of completed) {
                const date = this.formatDate(apt.startTime);
                const time = this.formatTime(apt.startTime);
                const devices = apt.devices?.map(d => d.deviceName).join(', ') || '';
                message += `   • ${date} - ${time}\n`;
                if (devices) message += `     Cihazlar: ${devices}\n`;
            }
            message += `\n`;
        }

        // Cancelled appointments
        if (cancelled.length > 0) {
            message += ` *İptal Edilen Randevular (Son ${cancelled.length}):*\n`;
            for (const apt of cancelled) {
                const date = this.formatDate(apt.startTime);
                const time = this.formatTime(apt.startTime);
                message += `   • ${date} - ${time}\n`;
            }
            message += `\n`;
        }

        message += `Görüşmek üzere!`;

        return {
            message,
            customer: { id: customer.id.toString(), fullName: customer.fullName, phone: customer.phone },
            appointmentsCount: {
                upcoming: upcomingScheduled.length,
                pastScheduled: pastScheduled.length,
                completed: completed.length,
                cancelled: cancelled.length,
                total: appointments.length
            }
        };
    }

    /**
     * Get debt message for customer (for copying)
     */
    async getDebtMessage(customerId, companyId) {
        const customer = await this.customerRepository.findById(customerId, companyId);
        if (!customer) throw new NotFoundError('Customer');

        const paymentsResult = await this.paymentRepository.findByCustomer(customerId, companyId, { page: 1, limit: 10 });
        const payments = paymentsResult.data || [];
        const totalDebt = customer.totalDebt || 0;

        let message = `Sayın ${customer.fullName},\n\n`;

        if (payments.length > 0) {
            message += `Ödeme geçmişiniz:\n`;
            for (const p of payments) {
                const date = this.formatDate(p.paidAt);
                const amount = `${Number(p.amount).toFixed(2)} TL`;
                const type = p.paymentType === 'CASH' ? 'Peşin' : 'Taksit';
                message += `${date} - ${amount} (${type})\n`;
            }
            message += `\n`;
        }
        if (totalDebt > 0) {
            message += `Kalan borcunuz: *${Number(totalDebt).toFixed(2)} TL*\n`;
        } else {
            message += `Şuan için borcunuz bulunmamaktadır.\n`;
        }
        message += `\nSorularınız için bize ulaşabilirsiniz.`;

        return {
            message,
            customer: { id: customer.id.toString(), fullName: customer.fullName, phone: customer.phone, totalDebt },
            paymentsCount: payments.length
        };
    }
}

export default CustomerService;
