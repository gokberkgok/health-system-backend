// Notifications repository - Database operations for notifications
import { withTenantFilter } from '../middlewares/tenantContext.js';

export class NotificationsRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    /**
     * Find all notifications for a company
     */
    async findByCompanyId(companyId, options = {}) {
        const { limit = 50, offset = 0, orderBy = { createdAt: 'desc' } } = options;

        return this.prisma.notification.findMany({
            where: {
                companyId: companyId,
            },
            orderBy,
            take: limit,
            skip: offset,
        });
    }

    /**
     * Create a new notification
     */
    async create(data) {
        return this.prisma.notification.create({
            data: {
                companyId: data.companyId,
                text: data.text,
            },
        });
    }

    /**
     * Delete a notification
     */
    async delete(id, companyId) {
        return this.prisma.notification.deleteMany({
            where: {
                id: id,
                companyId: companyId,
            },
        });
    }

    /**
     * Count notifications for a company
     */
    async countByCompanyId(companyId) {
        return this.prisma.notification.count({
            where: {
                companyId: companyId,
            },
        });
    }
}
