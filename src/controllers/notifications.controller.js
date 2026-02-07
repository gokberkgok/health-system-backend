// Notifications controller - HTTP handlers for notification management
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class NotificationsController {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }

    /**
     * GET /notifications - Get all notifications for the company
     */
    async getNotifications(request, reply) {
        try {
            // const { companyId } = request;
            const companyId = '1'; // Temporary for testing
            const { limit, offset } = request.query;

            const options = {};
            if (limit) options.limit = parseInt(limit);
            if (offset) options.offset = parseInt(offset);

            const notifications = await this.notificationsService.getNotifications(companyId, options);

            reply.send({
                success: true,
                data: notifications,
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            reply.code(500).send({
                success: false,
                message: 'Bildirimler alınırken hata oluştu',
            });
        }
    }

    /**
     * POST /notifications - Create a new notification
     */
    async createNotification(request, reply) {
        try {
            const { companyId } = request;
            const { text } = request.body;

            const notification = await this.notificationsService.createNotification(companyId, text);

            reply.code(201).send({
                success: true,
                data: notification,
                message: 'Bildirim başarıyla oluşturuldu',
            });
        } catch (error) {
            console.error('Create notification error:', error);

            if (error instanceof ValidationError) {
                return reply.code(400).send({
                    success: false,
                    message: error.message,
                });
            }

            reply.code(500).send({
                success: false,
                message: 'Bildirim oluşturulurken hata oluştu',
            });
        }
    }

    /**
     * DELETE /notifications/:id - Delete a notification
     */
    async deleteNotification(request, reply) {
        try {
            const { companyId } = request;
            const { id } = request.params;

            await this.notificationsService.deleteNotification(id, companyId);

            reply.send({
                success: true,
                message: 'Bildirim başarıyla silindi',
            });
        } catch (error) {
            console.error('Delete notification error:', error);

            if (error instanceof NotFoundError) {
                return reply.code(404).send({
                    success: false,
                    message: error.message,
                });
            }

            reply.code(500).send({
                success: false,
                message: 'Bildirim silinirken hata oluştu',
            });
        }
    }

    /**
     * GET /notifications/count - Get notification count for the company
     */
    async getNotificationCount(request, reply) {
        try {
            // const { companyId } = request;
            const companyId = '1'; // Temporary for testing

            const count = await this.notificationsService.getNotificationCount(companyId);

            reply.send({
                success: true,
                data: { count },
            });
        } catch (error) {
            console.error('Get notification count error:', error);
            reply.code(500).send({
                success: false,
                message: 'Bildirim sayısı alınırken hata oluştu',
            });
        }
    }
}