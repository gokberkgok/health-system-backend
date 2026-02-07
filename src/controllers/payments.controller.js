// Payment Controller
export class PaymentController {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Record a new payment
     * POST /api/payments
     */
    async create(request, reply) {
        const companyId = request.companyId;
        const payment = await this.paymentService.recordPayment(companyId, request.body);

        return {
            success: true,
            data: payment,
        };
    }

    /**
     * Get customer payment history
     * GET /api/payments/customer/:customerId
     */
    async getCustomerPayments(request, reply) {
        const companyId = request.companyId;
        const { customerId } = request.params;
        const { page, limit } = request.query;

        const result = await this.paymentService.getCustomerPayments(companyId, customerId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
        });

        return {
            success: true,
            ...result,
        };
    }
}
