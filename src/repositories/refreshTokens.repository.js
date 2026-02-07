// Refresh token repository - Database operations for refresh tokens
import crypto from 'crypto';

export class RefreshTokenRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    /**
     * Hash refresh token for secure storage
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Create or update refresh token for user - SIMPLIFIED
     * Only ONE token per user, stored hashed
     */
    async upsertForUser(userId, token, expiresAt) {
        const userIdBigInt = userId;
        const tokenHash = this.hashToken(token);

        // Delete any existing tokens for this user
        await this.prisma.refreshToken.deleteMany({
            where: { userId: userIdBigInt },
        });

        // Create new token
        return this.prisma.refreshToken.create({
            data: {
                userId: userIdBigInt,
                tokenHash,
                expiresAt,
            },
        });
    }

    /**
     * Find valid token by hash
     */
    async findByHash(tokenHash) {
        return this.prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    include: { company: true },
                },
            },
        });
    }

    /**
     * Find valid token (convenience method)
     */
    async findValidToken(token) {
        const tokenHash = this.hashToken(token);
        return this.findByHash(tokenHash);
    }

    /**
     * Delete all tokens for user
     */
    async deleteAllForUser(userId) {
        return this.prisma.refreshToken.deleteMany({
            where: { userId: userId },
        });
    }

    /**
     * Delete token by hash
     */
    async deleteByHash(tokenHash) {
        return this.prisma.refreshToken.deleteMany({
            where: { tokenHash },
        });
    }

    /**
     * Delete token by raw value
     */
    async deleteByToken(token) {
        const tokenHash = this.hashToken(token);
        return this.deleteByHash(tokenHash);
    }

    /**
     * Delete expired tokens (cleanup)
     */
    async deleteExpired() {
        return this.prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
    }
}

export default RefreshTokenRepository;
