// Device routes - All routes require authentication and tenant context
import { authenticate, tenantContext, authorize, sanitize } from '../middlewares/index.js';

export default async function deviceRoutes(fastify, options) {
    const { deviceController } = options;

    // Apply auth and tenant context to all routes in this scope
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', tenantContext);

    // GET /api/devices
    fastify.get('/', {
        handler: deviceController.getAll.bind(deviceController),
    });

    // GET /api/devices/:id
    fastify.get('/:id', {
        handler: deviceController.getById.bind(deviceController),
    });

    // POST /api/devices (ADMIN only)
    fastify.post('/', {
        preHandler: [authorize('ADMIN'), sanitize],
        handler: deviceController.create.bind(deviceController),
    });

    // PUT /api/devices/:id (ADMIN only)
    fastify.put('/:id', {
        preHandler: [authorize('ADMIN'), sanitize],
        handler: deviceController.update.bind(deviceController),
    });

    // DELETE /api/devices/:id (ADMIN only)
    fastify.delete('/:id', {
        preHandler: [authorize('ADMIN')],
        handler: deviceController.delete.bind(deviceController),
    });
}