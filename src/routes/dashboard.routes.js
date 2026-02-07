// Dashboard routes
import { authenticate, tenantContext } from '../middlewares/index.js';

export default async function dashboardRoutes(fastify, options) {
    const { dashboardController } = options;

    // Apply auth and tenant context to all routes
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', tenantContext);

    // GET /api/dashboard
    fastify.get('/', {
        handler: dashboardController.getStats.bind(dashboardController),
    });
}
