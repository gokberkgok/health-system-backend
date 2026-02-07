// Appointment service - Business logic for appointments
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

export class AppointmentService {
    constructor(appointmentRepository, customerRepository, deviceRepository) {
        this.appointmentRepository = appointmentRepository;
        this.customerRepository = customerRepository;
        this.deviceRepository = deviceRepository;
    }

    /**
     * Validate appointment data
     */
    validateAppointmentData(data) {
        const errors = [];

        if (!data.customerId) {
            errors.push('Customer is required');
        }

        if (!data.startTime) {
            errors.push('Start time is required');
        }

        if (!data.endTime) {
            errors.push('End time is required');
        }

        if (!data.devices || data.devices.length === 0) {
            errors.push('At least one device must be selected');
        }

        if (data.startTime && data.endTime) {
            const start = new Date(data.startTime);
            const end = new Date(data.endTime);

            //önceki tarihler
            /*if (start >= end) {
                errors.push('End time must be after start time');
            }

            if (start < new Date()) {
                errors.push('Cannot create appointments in the past');
            }*/
        }

        // Validate device sequences
        if (data.devices) {
            for (const device of data.devices) {
                if (!device.deviceName || !device.deviceName.trim()) {
                    errors.push('Device name is required');
                }
                if (!device.startTime || !device.endTime) {
                    errors.push(`Device ${device.deviceName} must have start and end times`);
                }
            }
        }

        if (errors.length > 0) {
            throw new ValidationError('Invalid appointment data', errors);
        }
    }

    /**
     * Validate devices exist in database (async)
     */
    async validateDevicesExist(companyId, devices) {
        const errors = [];

        for (const device of devices) {
            if (!device.deviceName) continue;

            const deviceRecord = await this.deviceRepository.findByName(device.deviceName, companyId);
            if (!deviceRecord) {
                errors.push(`Device "${device.deviceName}" does not exist. Please add it in Devices page first.`);
            }
        }

        if (errors.length > 0) {
            throw new ValidationError('Device validation failed', errors);
        }
    }

    /**
     * Get all appointments for a company
     */
    async getAll(companyId, options = {}) {
        const result = await this.appointmentRepository.findMany(companyId, options);

        return {
            data: result.appointments.map(this.formatAppointment),
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
        };
    }

    /**
     * Get appointments by date range (for calendar)
     */
    async getByDateRange(companyId, startDate, endDate) {
        const appointments = await this.appointmentRepository.findByDateRange(
            companyId,
            startDate,
            endDate
        );
        return appointments.map(this.formatAppointment);
    }

    /**
     * Get today's appointments
     */
    async getToday(companyId) {
        const appointments = await this.appointmentRepository.findTodayAppointments(companyId);
        return appointments.map(this.formatAppointment);
    }

    /**
     * Get upcoming appointments
     */
    async getUpcoming(companyId, limit = 5) {
        const appointments = await this.appointmentRepository.getUpcoming(companyId, limit);
        return appointments.map(this.formatAppointment);
    }

    /**
     * Get single appointment by ID
     */
    async getById(id, companyId) {
        const appointment = await this.appointmentRepository.findById(id, companyId);
        if (!appointment) {
            throw new NotFoundError('Appointment');
        }
        return this.formatAppointment(appointment);
    }

    /**
     * Create new appointment with conflict checking
     */
    async create(companyId, data) {
        this.validateAppointmentData(data);

        // Validate devices exist in database
        await this.validateDevicesExist(companyId, data.devices);

        // Verify customer exists
        const customer = await this.customerRepository.findById(data.customerId, companyId);
        if (!customer) {
            throw new NotFoundError('Customer');
        }

        // Check device conflicts
        const conflicts = await this.appointmentRepository.checkDeviceConflicts(
            companyId,
            data.devices
        );

        if (conflicts.length > 0) {
            throw new ConflictError(
                `Device conflicts detected: ${conflicts.map(c =>
                    `${c.deviceName} is booked for ${c.customerName}`
                ).join(', ')}`
            );
        }

        // Create appointment
        const appointment = await this.appointmentRepository.create(companyId, data);
        return this.formatAppointment(appointment);
    }

    /**
     * Update appointment status
     */
    async updateStatus(id, companyId, status) {
        const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid status', [`Status must be one of: ${validStatuses.join(', ')}`]);
        }

        const appointment = await this.appointmentRepository.updateStatus(id, companyId, status);
        if (!appointment) {
            throw new NotFoundError('Appointment');
        }
        return this.formatAppointment(appointment);
    }

    /**
     * Cancel appointment
     */
    async cancel(id, companyId) {
        const appointment = await this.appointmentRepository.cancel(id, companyId);
        if (!appointment) {
            throw new NotFoundError('Appointment');
        }
        return this.formatAppointment(appointment);
    }

    /**
     * Update appointment (reschedule, change devices, etc.)
     */
    async update(id, companyId, data) {
        // Validate if updating devices
        if (data.devices && data.devices.length > 0) {
            this.validateAppointmentData({ ...data, customerId: 'temp', startTime: data.startTime || new Date(), endTime: data.endTime || new Date() });
        }

        // Verify customer if changing
        if (data.customerId) {
            const customer = await this.customerRepository.findById(data.customerId, companyId);
            if (!customer) {
                throw new NotFoundError('Customer');
            }
        }

        // Update appointment (repository handles conflict checking)
        const appointment = await this.appointmentRepository.update(id, companyId, data);
        if (!appointment) {
            throw new NotFoundError('Appointment');
        }
        return this.formatAppointment(appointment);
    }

    /**
     * Get appointment statistics
     */
    async getStats(companyId) {
        const todayCount = await this.appointmentRepository.countToday(companyId);
        const upcoming = await this.appointmentRepository.getUpcoming(companyId, 5);

        return {
            todayCount,
            upcomingAppointments: upcoming.map(this.formatAppointment),
        };
    }

    /**
     * Check device availability for a time range
     */
    async checkAvailability(companyId, devices, customerId, excludeAppointmentId) {
        // Cihaz çakışmalarını kontrol et
        const conflicts = await this.appointmentRepository.checkDeviceConflicts(
            companyId,
            devices,
            excludeAppointmentId
        );

        // Müşteri randevu çakışması kontrolü - TEK SEFERDE
        // Randevunun genel zaman aralığını kullan (tüm cihazların min-max zamanı)
        if (customerId && devices && devices.length > 0) {
            // Find overall appointment time range
            const allStartTimes = devices.map(d => new Date(d.startTime));
            const allEndTimes = devices.map(d => new Date(d.endTime));
            const appointmentStart = new Date(Math.min(...allStartTimes));
            const appointmentEnd = new Date(Math.max(...allEndTimes));

            // Single customer conflict check
            const customerConflict = await this.appointmentRepository.checkCustomerTimeConflict(
                companyId,
                customerId,
                appointmentStart,
                appointmentEnd,
                excludeAppointmentId
            );

            if (customerConflict) {
                conflicts.push({
                    deviceName: 'Müşteri Çakışması',
                    conflictingAppointmentId: customerConflict.id,
                    customerName: customerConflict.customer.fullName,
                    startTime: customerConflict.startTime,
                    endTime: customerConflict.endTime,
                    deviceCapacity: null,
                    currentBookings: null,
                });
            }
        }

        return {
            isAvailable: conflicts.length === 0,
            conflicts: conflicts.map(c => ({
                deviceName: c.deviceName,
                conflictingAppointmentId: c.conflictingAppointmentId.toString(),
                customerName: c.customerName,
                startTime: c.startTime.toISOString(),
                endTime: c.endTime.toISOString(),
                deviceCapacity: c.deviceCapacity,
                currentBookings: c.currentBookings,
            })),
        };
    }

    /**
     * Mark appointment as completed
     */
    async completeAppointment(id, companyId) {
        const appointment = await this.appointmentRepository.findById(id, companyId);

        if (!appointment) {
            throw new NotFoundError('Appointment');
        }

        if (appointment.status === 'completed') {
            throw new ValidationError('Appointment is already completed');
        }

        if (appointment.status === 'cancelled') {
            throw new ValidationError('Cannot complete a cancelled appointment');
        }

        const updated = await this.appointmentRepository.updateStatus(id, companyId, 'completed');
        return this.formatAppointment(updated);
    }

    /**
     * Format appointment for API response
     */
    formatAppointment(appointment) {
        return {
            id: appointment.id.toString(),
            customerId: appointment.customerId.toString(),
            customerName: appointment.customer?.fullName,
            customerPhone: appointment.customer?.phone,
            startTime: appointment.startTime.toISOString(),
            endTime: appointment.endTime.toISOString(),
            status: appointment.status,
            notes: appointment.notes,
            devices: appointment.devices?.map(d => ({
                id: d.id.toString(),
                deviceName: d.deviceName,
                startTime: d.startTime.toISOString(),
                endTime: d.endTime.toISOString(),
                sequence: d.sequence,
            })),
            createdAt: appointment.createdAt.toISOString(),
            updatedAt: appointment.updatedAt?.toISOString(),
        };
    }
}

export default AppointmentService;
