// Auth controller - HTTP handlers for authentication
import config from '../config/index.js';

export class AuthController {
    constructor(authService, userRepository, logService, fastify) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.logService = logService;
        this.fastify = fastify;
    }

    /**
     * POST /api/auth/login
     */
    async login(request, reply) {
        const { email, password, clientType = 'WEB', deviceId, deviceName } = request.body;
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'] || 'Unknown';
        const origin = request.headers['origin'] || 'No Origin';

        // Log request origin for debugging
        console.log('[AUTH DEBUG] Login request:', {
            origin,
            clientType,
            ipAddress,
        });

        try {
            const result = await this.authService.login(email, password, {
                clientType,
                ipAddress,
                userAgent,
            });

            // Log successful login
            await this.logService.logLogin(
                result.user,
                clientType,
                ipAddress,
                userAgent,
                deviceId || null,
                deviceName || null
            );

            // Set auth cookies (for web)
            this.fastify.setAuthCookies(reply, result.accessToken, result.refreshToken);

            // For mobile clients, also include tokens in response body
            const isMobile = clientType === 'MOBILE';

            return {
                success: true,
                data: {
                    user: result.user,
                    // Only include tokens for mobile clients
                    ...(isMobile && {
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                    }),
                },
            };
        } catch (error) {
            // Log failed login

            throw error;
        }
    }

    /**
     * POST /api/auth/refresh
     */
    async refresh(request, reply) {
        const clientType = request.headers['x-client-type'] || 'WEB';
        const isMobile = clientType === 'MOBILE';

        // For mobile: get refresh token from Authorization header or body
        // For web: get from cookie
        let refreshToken;
        if (isMobile) {
            const authHeader = request.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                refreshToken = authHeader.substring(7);
            } else if (request.body && request.body.refreshToken) {
                refreshToken = request.body.refreshToken;
            }
        } else {
            refreshToken = request.cookies.refresh_token;
        }

        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'] || 'Unknown';
        const deviceId = request.headers['x-device-id'] || null;

        if (!refreshToken) {
            reply.code(401);
            return {
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Refresh token gerekli' },
            };
        }

        try {
            const result = await this.authService.refresh(refreshToken);

            // Get user info for logging - result only has tokens, need to get user from request
            if (request.user) {
                await this.logService.logTokenRefresh(
                    request.user.id,
                    request.user.companyId,
                    clientType,
                    ipAddress,
                    userAgent,
                    deviceId
                );
            }

            // Set new auth cookies (for web)
            this.fastify.setAuthCookies(reply, result.accessToken, result.refreshToken);
            reply.header('x-new-access-token', result.accessToken);

            return {
                success: true,
                data: {
                    message: 'Token yenilendi',
                    // Only include tokens for mobile clients
                    ...(isMobile && {
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                    }),
                },
            };
        } catch (error) {
            // If refresh fails, CLEAR COOKIES to prevent infinite loops in frontend middleware
            this.fastify.clearAuthCookies(reply);
            throw error;
        }
    }

    /**
     * POST /api/auth/logout
     */
    async logout(request, reply) {
        const refreshToken = request.cookies.refresh_token;

        this.fastify.log.info({
            hasRefreshToken: !!refreshToken,
            tokenPreview: refreshToken ? `${refreshToken.substring(0, 8)}...` : null
        }, 'Logout request');

        // Delete refresh token from database
        if (refreshToken) {
            try {
                const deleteResult = await this.authService.refreshTokenRepository.deleteByToken(refreshToken);
                this.fastify.log.info({ deleteCount: deleteResult.count }, 'Deleted refresh token by token hash');
            } catch (error) {
                this.fastify.log.error({ error: error.message }, 'Error deleting refresh token');
            }
        }

        // Clear all auth cookies
        this.fastify.clearAuthCookies(reply);

        return {
            success: true,
            data: { message: 'Çıkış yapıldı' },
        };
    }

    /**
     * GET /api/auth/me
     * Check session - if refresh token is valid, return user info
     */
    async me(request, reply) {
        const refreshToken = request.cookies.refresh_token;

        let userId = request.user?.id;

        if (!userId) {
            // If access token is invalid/expired, check refresh token
            const sessionUser = await this.authService.checkSession(refreshToken);

            if (!sessionUser) {
                // Clear cookies and return unauthorized
                this.fastify.clearAuthCookies(reply);
                reply.code(401);
                return {
                    success: false,
                    error: { code: 'UNAUTHORIZED', message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' },
                };
            }

            userId = sessionUser.id;

            // Valid refresh token - issue new access token
            const accessToken = this.authService.generateAccessToken({
                id: sessionUser.id,
                companyId: sessionUser.companyId,
                email: sessionUser.email,
                role: sessionUser.role,
            });

            // Set new access token cookie
            reply.cookie('access_token', accessToken, {
                httpOnly: true,
                secure: config.nodeEnv === 'production',
                sameSite: 'none',
                path: '/',
                maxAge: config.jwt.accessExpiresInMs,
            });
            reply.header('x-new-access-token', accessToken);
        }

        const user = await this.userRepository.findById(userId);

        if (!user) {
            // Clear cookies and return unauthorized
            this.fastify.clearAuthCookies(reply);
            reply.code(401);
            return {
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'User not found or session invalid.' },
            };
        }

        return {
            success: true,
            data: {
                id: user.id,
                companyId: user.companyId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyName: user.company.name,
                planKey: user.company.plan.key,
                planName: user.company.plan.name,
            },
        };
    }

    /**
     * POST /api/auth/register (Admin only)
     */
    async register(request, reply) {
        const result = await this.authService.register(
            request.body,
            request.companyId
        );

        reply.code(201);
        return {
            success: true,
            data: { user: result },
        };
    }

    /**
     * POST /api/auth/change-password
     */
    async changePassword(request, reply) {
        const { currentPassword, newPassword } = request.body;

        await this.authService.changePassword(
            request.user.id,
            currentPassword,
            newPassword
        );

        // Clear auth cookies (force re-login)
        this.fastify.clearAuthCookies(reply);

        return {
            success: true,
            data: { message: 'Şifre değiştirildi. Lütfen tekrar giriş yapın.' },
        };
    }
}

export default AuthController;
