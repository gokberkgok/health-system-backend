// Customer Payment Repository - Data access for payments
import { withTenantFilter } from '../middlewares/tenantContext.js';

export class PaymentRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    // Transform payment to convert Decimal amount to Number
    transformPayment(payment) {
        if (!payment) return null;
        return {
            ...payment,
            amount: parseFloat(payment.amount),
        };
    }

    /**
     * Create a new payment
     */
    async create(companyId, data) {
        const payment = await this.prisma.payment.create({
            data: {
                companyId: companyId,
                customerId: data.customerId,
                amount: data.amount,
                paymentType: data.paymentType,
                paidAt: data.paidAt || new Date(),
                notes: data.notes,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
        return this.transformPayment(payment);
    }

    /**
     * Get payment history for a customer
     */
    async findByCustomer(customerId, companyId, options = {}) {
        const { page = 1, limit = 20 } = options;

        const where = withTenantFilter(companyId, {
            customerId: customerId,
        });

        const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                orderBy: { paidAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.payment.count({ where }),
        ]);

        return {
            data: payments.map(p => this.transformPayment(p)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get total paid amount for a customer
     */
    async getTotalPaid(companyId, customerId) {
        const result = await this.prisma.payment.aggregate({
            where: withTenantFilter(companyId, {
                customerId: customerId,
            }),
            _sum: {
                amount: true,
            },
        });

        return parseFloat(result._sum.amount) || 0;
    }

    /**
     * Get payments by date range
     */
    async findByDateRange(companyId, startDate, endDate) {
        const payments = await this.prisma.payment.findMany({
            where: withTenantFilter(companyId, {
                paidAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            }),
            orderBy: { paidAt: 'desc' },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                    },
                },
            },
        });
        return payments.map(p => this.transformPayment(p));
    }

    /**
     * Delete a payment (since there's no status field)
     */
    async delete(companyId, paymentId) {
        const payment = await this.prisma.payment.delete({
            where: {
                id: paymentId,
            },
        });
        return this.transformPayment(payment);
    }
}

export default PaymentRepository;
