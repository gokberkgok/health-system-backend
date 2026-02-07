// Notifications routes - All routes require authentication and tenant context
import { authenticate, tenantContext, authorize } from '../middlewares/index.js';

export default async function notificationsRoutes(fastify, options) {
    const { notificationsController } = options;

    // Apply auth and tenant context to all routes in this scope
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', tenantContext);

    // GET /api/notifications
    fastify.get('/', {
        handler: notificationsController.getNotifications.bind(notificationsController),
    });

    // GET /api/notifications/count
    fastify.get('/count', {
        handler: notificationsController.getNotificationCount.bind(notificationsController),
    });

    // POST /api/notifications (STAFF or ADMIN only)
    fastify.post('/', {
        preHandler: authorize('STAFF', 'ADMIN'),
        handler: notificationsController.createNotification.bind(notificationsController),
    });

    // DELETE /api/notifications/:id (STAFF or ADMIN only)
    fastify.delete('/:id', {
        preHandler: authorize('STAFF', 'ADMIN'),
        handler: notificationsController.deleteNotification.bind(notificationsController),
    });
}