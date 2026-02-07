// Appointments controller - HTTP handlers for appointment management
export class AppointmentsController {
    constructor(appointmentService) {
        this.appointmentService = appointmentService;
    }

    /**
     * GET /api/appointments
     */
    async getAll(request, reply) {
        const { page, limit, startDate, endDate, customerId, status, deviceName } = request.query;

        const result = await this.appointmentService.getAll(request.companyId, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            startDate,
            endDate,
            customerId,
            status,
            deviceName,
        });

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
     * GET /api/appointments/calendar
     */
    async getCalendar(request, reply) {
        const { startDate, endDate } = request.query;

        if (!startDate || !endDate) {
            reply.code(400);
            return {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate are required' },
            };
        }

        const result = await this.appointmentService.getByDateRange(
            request.companyId,
            startDate,
            endDate
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * GET /api/appointments/today
     */
    async getToday(request, reply) {
        const result = await this.appointmentService.getToday(request.companyId);

        return {
            success: true,
            data: result,
        };
    }

    /**
     * GET /api/appointments/upcoming
     */
    async getUpcoming(request, reply) {
        const { limit } = request.query;
        const result = await this.appointmentService.getUpcoming(
            request.companyId,
            limit ? parseInt(limit) : 5
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * GET /api/appointments/:id
     */
    async getById(request, reply) {
        const result = await this.appointmentService.getById(
            request.params.id,
            request.companyId
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * POST /api/appointments
     */
    async create(request, reply) {
        const result = await this.appointmentService.create(
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
     * PATCH /api/appointments/:id/status
     */
    async updateStatus(request, reply) {
        const { status } = request.body;

        const result = await this.appointmentService.updateStatus(
            request.params.id,
            request.companyId,
            status
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * POST /api/appointments/:id/cancel
     */
    async cancel(request, reply) {
        const result = await this.appointmentService.cancel(
            request.params.id,
            request.companyId
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * PUT /api/appointments/:id
     */
    async update(request, reply) {
        const result = await this.appointmentService.update(
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
     * POST /api/appointments/check-availability
     */
    async checkAvailability(request, reply) {
        const { devices, excludeAppointmentId, customerId } = request.body;

        const result = await this.appointmentService.checkAvailability(
            request.companyId,
            devices,
            customerId,
            excludeAppointmentId
        );

        return {
            success: true,
            data: result,
        };
    }

    /**
     * PATCH /api/appointments/:id/complete
     */
    async completeAppointment(request, reply) {
        const { id } = request.params;

        const result = await this.appointmentService.completeAppointment(
            id,
            request.companyId
        );

        return {
            success: true,
            data: result,
            message: 'Appointment marked as completed',
        };
    }

    /**
     * GET /api/appointments/stats
     */
    async getStats(request, reply) {
        const result = await this.appointmentService.getStats(request.companyId);

        return {
            success: true,
            data: result,
        };
    }
}

export default AppointmentsController;
