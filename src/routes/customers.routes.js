// Customer routes - All routes require authentication and tenant context
import { authenticate, tenantContext, authorize, sanitize } from '../middlewares/index.js';

export default async function customersRoutes(fastify, options) {
    const { customersController } = options;

    // Apply auth and tenant context to all routes in this scope
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', tenantContext);

    // GET /api/customers
    fastify.get('/', {
        handler: customersController.getAll.bind(customersController),
    });

    // GET /api/customers/stats
    fastify.get('/stats', {
        handler: customersController.getStats.bind(customersController),
    });

    // GET /api/customers/:id
    fastify.get('/:id', {
        handler: customersController.getById.bind(customersController),
    });

    // POST /api/customers (STAFF or ADMIN only)
    fastify.post('/', {
        preHandler: [authorize('STAFF', 'ADMIN'), sanitize],
        handler: customersController.create.bind(customersController),
    });

    // PUT /api/customers/:id (STAFF or ADMIN only)
    fastify.put('/:id', {
        preHandler: [authorize('STAFF', 'ADMIN'), sanitize],
        handler: customersController.update.bind(customersController),
    });

    // DELETE /api/customers/:id (ADMIN only)
    fastify.delete('/:id', {
        preHandler: [authorize('ADMIN')],
        handler: customersController.delete.bind(customersController),
    });

    // Message Preview: Get appointment message
    fastify.get('/:id/message/appointment', {
        handler: customersController.getAppointmentMessage.bind(customersController),
    });

    // Message Preview: Get debt message
    fastify.get('/:id/message/debt', {
        handler: customersController.getDebtMessage.bind(customersController),
    });
}
