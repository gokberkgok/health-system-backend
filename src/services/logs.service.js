// Log Service - Comprehensive activity logging
export class LogService {
    constructor(prisma) {
        this.prisma = prisma;
    }

    /**
     * Create a log entry
     * @param {Object} logData - Log entry data
     * @param {string} logData.action - LogAction enum value
     * @param {string} logData.clientType - ClientType enum value
     * @param {string} logData.ipAddress - Client IP address
     * @param {string} logData.userAgent - Client user agent
     * @param {string} [logData.companyId] - Company ID (optional)
     * @param {string} [logData.userId] - User ID (optional)
     * @param {string} [logData.deviceId] - Device ID (optional)
     * @param {Object} [logData.metadata] - Additional metadata (optional)
     */
    async create(logData) {
        try {
            return await this.prisma.log.create({
                data: {
                    companyId: logData.companyId || null,
                    userId: logData.userId || null,
                    action: logData.action,
                    clientType: logData.clientType,
                    ipAddress: logData.ipAddress,
                    deviceId: logData.deviceId || null,
                    userAgent: logData.userAgent,
                    metadata: logData.metadata || null,
                },
            });
        } catch (error) {
            // Log creation should not break the main flow
            console.error('Failed to create log:', error);
            return null;
        }
    }

    /**
     * Log login success
     */
    async logLogin(user, clientType, ipAddress, userAgent, deviceId, deviceName) {
        return this.create({
            userId: user.id,
            companyId: user.companyId,
            action: 'LOGIN',
            clientType,
            ipAddress,
            userAgent,
            deviceId,
            metadata: {
                deviceName,
                loginMethod: 'password',
                userRole: user.role,
                planKey: user.company?.plan?.key || 'UNKNOWN',
            },
        });
    }

    /**
     * Log login failure
     */
    async logLoginFailed(email, reason, clientType, ipAddress, userAgent, userId = null, companyId = null) {
        return this.create({
            userId,
            companyId,
            action: 'INVALID_CREDENTIALS',
            clientType,
            ipAddress,
            userAgent,
            metadata: {
                reason,
                attemptedEmail: email,
                failureType: 'authentication',
            },
        });
    }

    /**
     * Log mobile login restriction (BASIC plan)
     */
    async logForbiddenMobileLogin(user, currentPlan, ipAddress, userAgent, deviceId) {
        return this.create({
            userId: user.id,
            companyId: user.companyId,
            action: 'FORBIDDEN_MOBILE_LOGIN',
            clientType: 'MOBILE',
            ipAddress,
            userAgent,
            deviceId,
            metadata: {
                reason: 'BASIC_PLAN_MOBILE_ACCESS',
                currentPlan,
                requiredPlan: 'PREMIUM',
                route: '/auth/login',
                status: 403,
            },
        });
    }

    /**
     * Log plan violation (feature access denied)
     */
    async logPlanViolation(user, feature, clientType, ipAddress, userAgent) {
        return this.create({
            userId: user.id,
            companyId: user.companyId,
            action: 'PLAN_VIOLATION',
            clientType,
            ipAddress,
            userAgent,
            metadata: {
                reason: 'FEATURE_ACCESS_DENIED',
                currentPlan: user.company?.plan?.key,
                requiredFeature: feature,
                status: 403,
            },
        });
    }

    /**
     * Log logout
     */
    async logLogout(userId, companyId, clientType, ipAddress, userAgent, deviceId) {
        return this.create({
            userId,
            companyId,
            action: 'LOGOUT',
            clientType,
            ipAddress,
            userAgent,
            deviceId,
            metadata: {
                reason: 'user_initiated',
            },
        });
    }

    /**
     * Log token refresh
     */
    async logTokenRefresh(userId, companyId, clientType, ipAddress, userAgent, deviceId) {
        return this.create({
            userId,
            companyId,
            action: 'REFRESH_TOKEN',
            clientType,
            ipAddress,
            userAgent,
            deviceId,
        });
    }

    /**
     * Log appointment status change
     */
    async logAppointmentStatusChange(appointmentId, oldStatus, newStatus, userId, companyId, clientType, ipAddress, userAgent) {
        return this.create({
            userId,
            companyId,
            action: `${newStatus}_APPOINTMENT`,
            clientType,
            ipAddress,
            userAgent,
            metadata: {
                appointmentId,
                oldStatus,
                newStatus,
                changedBy: userId,
            },
        });
    }

    /**
     * Log business action (generic)
     */
    async logBusinessAction(action, entityType, entityId, userId, companyId, clientType, ipAddress, userAgent, metadata = {}) {
        return this.create({
            userId,
            companyId,
            action,
            clientType,
            ipAddress,
            userAgent,
            metadata: {
                entityType,
                entityId,
                ...metadata,
            },
        });
    }

    /**
     * Log unauthorized access attempt
     */
    async logUnauthorizedAccess(route, reason, clientType, ipAddress, userAgent, userId = null, companyId = null) {
        return this.create({
            userId,
            companyId,
            action: 'UNAUTHORIZED_ACCESS',
            clientType,
            ipAddress,
            userAgent,
            metadata: {
                route,
                reason,
                status: 401,
            },
        });
    }

    /**
     * Get logs for a company
     */
    async getByCompany(companyId, options = {}) {
        const { page = 1, limit = 50, action, clientType, userId, startDate, endDate } = options;
        const skip = (page - 1) * limit;

        const where = {
            companyId,
            ...(action && { action }),
            ...(clientType && { clientType }),
            ...(userId && { userId }),
            ...(startDate && endDate && {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            }),
        };

        const [logs, total] = await Promise.all([
            this.prisma.log.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                },
            }),
            this.prisma.log.count({ where }),
        ]);

        return {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get authentication logs with filters
     */
    async getAuthLogs(companyId, options = {}) {
        return this.getByCompany(companyId, {
            ...options,
            action: {
                in: ['LOGIN', 'LOGOUT', 'REFRESH_TOKEN', 'INVALID_CREDENTIALS', 'FORBIDDEN_MOBILE_LOGIN'],
            },
        });
    }

    /**
     * Get security violation logs
     */
    async getSecurityLogs(companyId, options = {}) {
        return this.getByCompany(companyId, {
            ...options,
            action: {
                in: ['UNAUTHORIZED_ACCESS', 'PLAN_VIOLATION', 'FORBIDDEN_MOBILE_LOGIN', 'INVALID_CREDENTIALS'],
            },
        });
    }
}
