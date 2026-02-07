// Payment routes - All routes require authentication and tenant context
import { authenticate, tenantContext, authorize, sanitize } from '../middlewares/index.js';

export default async function paymentsRoutes(fastify, options) {
    const { paymentController } = options;

    // Apply auth and tenant context to all routes in this scope
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', tenantContext);

    // POST /api/payments (STAFF or ADMIN only)
    fastify.post('/', {
        preHandler: [authorize('STAFF', 'ADMIN'), sanitize],
        handler: paymentController.create.bind(paymentController),
    });

    // GET /api/payments/customer/:customerId
    fastify.get('/customer/:customerId', {
        handler: paymentController.getCustomerPayments.bind(paymentController),
    });
}