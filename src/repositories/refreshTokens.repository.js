// Refresh Token Repository - Database operations for refresh tokens
import { hashToken, generateRefreshToken } from '../utils/tokenHash.js';
import config from '../config/index.js';

export class RefreshTokenRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    /**
     * Create a new refresh token with client tracking
     */
    async create(data) {
        const {
            userId,
            companyId,
            token,
            clientType,
            deviceId = null,
            deviceName = null,
            ipAddress,
            userAgent,
        } = data;

        const tokenHash = hashToken(token);
        const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInMs);

        return await this.prisma.refreshToken.create({
            data: {
                userId,
                companyId,
                tokenHash,
                clientType,
                deviceId,
                deviceName,
                ipAddress,
                userAgent,
                expiresAt,
            },
        });
    }

    /**
     * Find a valid refresh token by token hash
     */
    async findByToken(token) {
        const tokenHash = hashToken(token);

        return await this.prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    include: {
                        company: {
                            include: { plan: true },
                        },
                    },
                },
            },
        });
    }

    /**
     * Update lastUsedAt timestamp
     */
    async updateLastUsed(tokenId) {
        return await this.prisma.refreshToken.update({
            where: { id: tokenId },
            data: { lastUsedAt: new Date() },
        });
    }

    /**
     * Revoke a refresh token
     */
    async revoke(token) {
        const tokenHash = hashToken(token);

        return await this.prisma.refreshToken.updateMany({
            where: { tokenHash },
            data: { revokedAt: new Date() },
        });
    }

    /**
     * Revoke all tokens for a user (useful for logout all devices)
     */
    async revokeAllForUser(userId) {
        return await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    /**
     * Get active sessions for a user
     */
    async getActiveSessionsForUser(userId) {
        return await this.prisma.refreshToken.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { lastUsedAt: 'desc' },
            select: {
                id: true,
                clientType: true,
                deviceId: true,
                deviceName: true,
                ipAddress: true,
                createdAt: true,
                lastUsedAt: true,
            },
        });
    }

    /**
     * Clean up expired and revoked tokens (run periodically)
     */
    async cleanup() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        return await this.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { revokedAt: { lt: thirtyDaysAgo } },
                ],
            },
        });
    }

    // ===== Legacy compatibility methods (to not break existing code) =====

    /**
     * @deprecated Use create() with full client data instead
     */
    async upsertForUser(userId, token, expiresAt) {
        // This is a simplified version for backward compatibility
        const tokenHash = hashToken(token);

        // Delete old tokens for this user (allow multi-device now)
        // Keep last 5 devices max
        const existingTokens = await this.prisma.refreshToken.findMany({
            where: { userId, revokedAt: null },
            orderBy: { lastUsedAt: 'desc' },
            select: { id: true },
        });

        if (existingTokens.length >= 5) {
            const tokensToDelete = existingTokens.slice(4);
            await this.prisma.refreshToken.deleteMany({
                where: {
                    id: { in: tokensToDelete.map(t => t.id) },
                },
            });
        }

        // Get companyId from user
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true },
        });

        // Create new token (with minimal data for legacy support)
        return await this.prisma.refreshToken.create({
            data: {
                userId,
                companyId: user.companyId,
                tokenHash,
                clientType: 'WEB', // Default to WEB for legacy
                ipAddress: '0.0.0.0',
                userAgent: 'Legacy',
                expiresAt,
            },
        });
    }

    /**
     * @deprecated Use hashToken utility directly
     */
    hashToken(token) {
        return hashToken(token);
    }

    /**
     * @deprecated Use findByToken instead
     */
    async findValidToken(token) {
        return this.findByToken(token);
    }

    /**
     * @deprecated Use revokeAllForUser instead
     */
    async deleteAllForUser(userId) {
        return this.revokeAllForUser(userId);
    }

    /**
     * @deprecated Use revoke instead
     */
    async deleteByToken(token) {
        return this.revoke(token);
    }
}

export default RefreshTokenRepository;
