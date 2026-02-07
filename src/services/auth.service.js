// Authentication service - Business logic for auth
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors.js';
import { validateEmail, validatePassword } from '../utils/validators.js';

export class AuthService {
    constructor(userRepository, refreshTokenRepository, fastify) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.fastify = fastify;
    }

    /**
     * Generate access token (short-lived)
     */
    generateAccessToken(user) {
        return this.fastify.jwt.sign({
            sub: user.id.toString(),
            companyId: user.companyId.toString(),
            email: user.email,
            role: user.role,
        });
    }

    /**
     * Generate refresh token data
     */
    generateRefreshToken(user) {
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInMs);
        return { token, expiresAt };
    }

    /**
     * Login with email and password
     */
    async login(email, password) {
        // Validate input
        if (!validateEmail(email)) {
            throw new ValidationError('Geçersiz e-posta formatı');
        }

        // Find user
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new UnauthorizedError('E-posta veya şifre hatalı');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedError('Hesap devre dışı');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('E-posta veya şifre hatalı');
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const { token: refreshToken, expiresAt } = this.generateRefreshToken(user);

        // Log for debugging
        const tokenHash = this.refreshTokenRepository.hashToken(refreshToken);
        console.log('[LOGIN DEBUG] Token generated:', {
            tokenPreview: `${refreshToken.substring(0, 8)}...`,
            hashPreview: `${tokenHash.substring(0, 16)}...`,
            userId: user.id.toString(),
            expiresAt
        });

        // Store refresh token - Delete old, create new
        await this.refreshTokenRepository.upsertForUser(user.id, refreshToken, expiresAt);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyId: user.companyId.toString(),
                companyName: user.company.name,
            },
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refresh(refreshToken) {
        // Find valid refresh token
        const tokenRecord = await this.refreshTokenRepository.findValidToken(refreshToken);
        if (!tokenRecord) {
            throw new UnauthorizedError('Geçersiz veya süresi dolmuş refresh token');
        }

        const user = tokenRecord.user;

        // Check if user is still active
        if (!user.isActive) {
            await this.refreshTokenRepository.deleteAllForUser(user.id);
            throw new UnauthorizedError('Hesap devre dışı');
        }

        // Generate new tokens
        const accessToken = this.generateAccessToken(user);
        const { token: newRefreshToken, expiresAt } = this.generateRefreshToken(user);

        // Replace old refresh token with new one
        await this.refreshTokenRepository.upsertForUser(user.id, newRefreshToken, expiresAt);

        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }

    /**
     * Logout - invalidate user's refresh token
     */
    async logout(userId) {
        // Delete the user's refresh token
        await this.refreshTokenRepository.deleteAllForUser(userId);
        return true;
    }

    /**
     * Check if user has valid session (for /api/auth/me)
     */
    async checkSession(refreshToken) {
        if (!refreshToken) {
            return null;
        }

        const tokenRecord = await this.refreshTokenRepository.findValidToken(refreshToken);
        if (!tokenRecord) {
            return null;
        }

        const user = tokenRecord.user;
        if (!user.isActive) {
            await this.refreshTokenRepository.deleteAllForUser(user.id);
            return null;
        }

        return {
            id: user.id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyId: user.companyId.toString(),
            companyName: user.company.name,
        };
    }

    /**
     * Register new user (admin only)
     */
    async register(data, companyId) {
        // Validate email
        if (!validateEmail(data.email)) {
            throw new ValidationError('Geçersiz e-posta formatı');
        }

        // Validate password
        const passwordValidation = validatePassword(data.password);
        if (!passwordValidation.isValid) {
            throw new ValidationError('Şifre gereksinimleri karşılanmıyor', passwordValidation.errors);
        }

        // Check if email already exists
        const existingUser = await this.userRepository.findByEmail(data.email);
        if (existingUser) {
            throw new ValidationError('Bu e-posta adresi zaten kayıtlı');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);

        // Create user
        const user = await this.userRepository.create({
            companyId,
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role || 'USER',
        });

        return {
            id: user.id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        };
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('Kullanıcı');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Mevcut şifre hatalı');
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            throw new ValidationError('Yeni şifre gereksinimleri karşılanmıyor', passwordValidation.errors);
        }

        // Hash and update password
        const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
        await this.userRepository.update(userId, user.companyId, { passwordHash });

        // Invalidate refresh token (force re-login)
        await this.refreshTokenRepository.deleteAllForUser(userId);

        return true;
    }
}

export default AuthService;
