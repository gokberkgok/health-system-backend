// Customers controller - HTTP handlers for customer management
export class CustomersController {
    constructor(customerService) {
        this.customerService = customerService;
    }

    /**
     * GET /api/customers
     */
    async getAll(request, reply) {
        const { page, limit, search, gender } = request.query;

        const result = await this.customerService.getAll(request.companyId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            search,
            gender,
        });

        // Set pagination headers
        reply.header('X-Total-Count', result.pagination.total);
        reply.header('X-Page', result.pagination.page);
        reply.header('X-Per-Page', result.pagination.limit);

        return {
            success: true,
            data: result.data,
            pagination: result.pagination,
        };
    }

    /**
     * GET /api/customers/:id
     */
    async getById(request, reply) {
        const result = await this.customerService.getById(
            request.params.id,
            request.companyId
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * POST /api/customers
     */
    async create(request, reply) {
        const result = await this.customerService.create(
            request.companyId,
            request.body
        );

        reply.code(201);
        return {
            success: true,
            data: result,
        };
    }

    /**
     * PUT /api/customers/:id
     */
    async update(request, reply) {
        const result = await this.customerService.update(
            request.params.id,
            request.companyId,
            request.body
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * DELETE /api/customers/:id
     */
    async delete(request, reply) {
        await this.customerService.delete(
            request.params.id,
            request.companyId
        );

        return {
            success: true,
            data: { message: 'Customer deleted' },
        };
    }

    /**
     * GET /api/customers/stats
     */
    async getStats(request, reply) {
        const result = await this.customerService.getStats(request.companyId);

        return {
            success: true,
            data: result,
        };
    }

    /**
     * GET /api/customers/:id/message/appointment
     * Returns message text for user to copy
     */
    async getAppointmentMessage(request, reply) {
        try {
            const result = await this.customerService.getAppointmentMessage(
                request.params.id,
                request.companyId
            );
            return { success: true, data: result };
        } catch (error) {
            reply.code(400);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * GET /api/customers/:id/message/debt
     * Returns message text for user to copy
     */
    async getDebtMessage(request, reply) {
        try {
            const result = await this.customerService.getDebtMessage(
                request.params.id,
                request.companyId
            );
            return { success: true, data: result };
        } catch (error) {
            reply.code(400);
            return { success: false, error: { message: error.message } };
        }
    }
}

export default CustomersController;
