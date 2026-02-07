// Auth routes
import { authenticate, authorize, tenantContext, sanitize } from '../middlewares/index.js';
import config from '../config/index.js';

// Stricter rate limit for auth endpoints
const authRateLimitConfig = {
    max: config.rateLimit.auth.max,
    timeWindow: config.rateLimit.auth.timeWindow,
};

export default async function authRoutes(fastify, options) {
    const { authController } = options;

    // Public routes (no auth required)
    fastify.post('/login', {
        config: { rateLimit: authRateLimitConfig },
        preHandler: [sanitize],
        handler: authController.login.bind(authController),
    });

    fastify.post('/refresh', {
        config: { rateLimit: authRateLimitConfig },
        handler: authController.refresh.bind(authController),
    });

    fastify.post('/logout', {
        handler: authController.logout.bind(authController),
    });

    // /me route - Does NOT require authentication middleware
    // It checks refresh token internally and issues new access token if valid
    fastify.get('/me', {
        handler: async (request, reply) => {
            // Try to verify access token first
            const accessToken = request.cookies.access_token;
            if (accessToken) {
                try {
                    const decoded = fastify.jwt.verify(accessToken);
                    request.user = {
                        id: decoded.sub,
                        email: decoded.email,
                        role: decoded.role,
                        companyId: decoded.companyId,
                    };
                } catch (error) {
                    // Access token expired or invalid, continue to check refresh token
                    request.user = null;
                }
            }
            return authController.me.call(authController, request, reply);
        },
    });

    // Protected routes (auth required)
    fastify.post('/change-password', {
        preHandler: [authenticate, sanitize],
        handler: authController.changePassword.bind(authController),
    });

    // Admin only routes
    fastify.post('/register', {
        preHandler: [authenticate, tenantContext, authorize('ADMIN'), sanitize],
        handler: authController.register.bind(authController),
    });
}
