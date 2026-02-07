// Appointment routes - All routes require authentication and tenant context
import { authenticate, tenantContext, authorize, sanitize } from '../middlewares/index.js';

export default async function appointmentsRoutes(fastify, options) {
    const { appointmentsController } = options;

    // Apply auth and tenant context to all routes in this scope
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', tenantContext);

    // GET /api/appointments
    fastify.get('/', {
        handler: appointmentsController.getAll.bind(appointmentsController),
    });

    // GET /api/appointments/calendar
    fastify.get('/calendar', {
        handler: appointmentsController.getCalendar.bind(appointmentsController),
    });

    // GET /api/appointments/today
    fastify.get('/today', {
        handler: appointmentsController.getToday.bind(appointmentsController),
    });

    // GET /api/appointments/upcoming
    fastify.get('/upcoming', {
        handler: appointmentsController.getUpcoming.bind(appointmentsController),
    });

    // GET /api/appointments/stats
    fastify.get('/stats', {
        handler: appointmentsController.getStats.bind(appointmentsController),
    });

    // GET /api/appointments/:id
    fastify.get('/:id', {
        handler: appointmentsController.getById.bind(appointmentsController),
    });

    // POST /api/appointments (STAFF or ADMIN only)
    fastify.post('/', {
        preHandler: [authorize('STAFF', 'ADMIN'), sanitize],
        handler: appointmentsController.create.bind(appointmentsController),
    });

    // POST /api/appointments/check-availability (STAFF or ADMIN only)
    fastify.post('/check-availability', {
        preHandler: [authorize('STAFF', 'ADMIN'), sanitize],
        handler: appointmentsController.checkAvailability.bind(appointmentsController),
    });

    // PATCH /api/appointments/:id/status (STAFF or ADMIN only)
    fastify.patch('/:id/status', {
        preHandler: [authorize('STAFF', 'ADMIN'), sanitize],
        handler: appointmentsController.updateStatus.bind(appointmentsController),
    });

    // PATCH /api/appointments/:id/complete (STAFF or ADMIN only)
    fastify.patch('/:id/complete', {
        preHandler: [authorize('STAFF', 'ADMIN')],
        handler: appointmentsController.completeAppointment.bind(appointmentsController),
    });

    // POST /api/appointments/:id/cancel (STAFF or ADMIN only)
    fastify.post('/:id/cancel', {
        preHandler: [authorize('STAFF', 'ADMIN')],
        handler: appointmentsController.cancel.bind(appointmentsController),
    });

    // PUT /api/appointments/:id (STAFF or ADMIN only)
    fastify.put('/:id', {
        preHandler: [authorize('STAFF', 'ADMIN'), sanitize],
        handler: appointmentsController.update.bind(appointmentsController),
    });
}
