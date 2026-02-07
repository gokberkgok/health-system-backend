// Notifications service - Business logic for notifications
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class NotificationsService {
    constructor(notificationsRepository) {
        this.notificationsRepository = notificationsRepository;
    }

    /**
     * Get all notifications for a company
     */
    async getNotifications(companyId, options = {}) {
        const notifications = await this.notificationsRepository.findByCompanyId(companyId, options);

        return notifications.map(notification => this.formatNotification(notification));
    }

    /**
     * Create a new notification
     */
    async createNotification(companyId, text) {
        if (!text || text.trim().length === 0) {
            throw new ValidationError('Notification text is required');
        }

        const notification = await this.notificationsRepository.create({
            companyId,
            text: text.trim(),
        });

        return this.formatNotification(notification);
    }

    /**
     * Delete a notification
     */
    async deleteNotification(id, companyId) {
        const result = await this.notificationsRepository.delete(id, companyId);

        if (result.count === 0) {
            throw new NotFoundError('Notification not found');
        }

        return true;
    }

    /**
     * Get notification count for a company
     */
    async getNotificationCount(companyId) {
        return this.notificationsRepository.countByCompanyId(companyId);
    }

    /**
     * Format notification for API response
     */
    formatNotification(notification) {
        return {
            id: notification.id.toString(),
            companyId: notification.companyId.toString(),
            text: notification.text,
            createdAt: notification.createdAt.toISOString(),
            updatedAt: notification.updatedAt.toISOString(),
        };
    }
}