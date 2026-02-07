// Payment Service
import { AppError } from '../utils/errors.js';

export class PaymentService {
    constructor(paymentRepository, customerRepository) {
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
    }

    /**
     * Record a payment and update customer debt
     */
    async recordPayment(companyId, data) {
        const { customerId, amount, paymentType, notes } = data;

        // Validate customer exists
        const customer = await this.customerRepository.findById(customerId, companyId);
        if (!customer) {
            throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }

        // Validate amount
        if (!amount || amount <= 0) {
            throw new AppError('Invalid payment amount', 400, 'INVALID_AMOUNT');
        }
        if (amount > (customer.totalDebt || 0)) {
            throw new AppError('Ödeme tutarı mevcut borçtan fazla olamaz', 400, 'AMOUNT_EXCEEDS_DEBT');
        }

        // Record payment
        const payment = await this.paymentRepository.create(companyId, {
            customerId,
            amount,
            paymentType: paymentType || 'CASH',
            notes,
        });

        // Update customer debt
        const newDebt = Math.max(0, (customer.totalDebt || 0) - amount);
        await this.customerRepository.update(customerId, companyId, {
            totalDebt: newDebt,
        });

        return payment;
    }

    /**
     * Get customer payment history
     */
    async getCustomerPayments(companyId, customerId, options = {}) {
        return this.paymentRepository.findByCustomer(customerId, companyId, options);
    }

    /**
     * Get customer total debt
     */
    async getCustomerDebt(companyId, customerId) {
        const customer = await this.customerRepository.findById(customerId, companyId);
        if (!customer) {
            throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }

        return {
            customerId,
            totalDebt: customer.totalDebt || 0,
        };
    }
}
