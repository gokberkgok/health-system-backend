// Authentication plugin: JWT with cookies
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import config from '../config/index.js';

async function authPlugin(fastify, options) {
    // Cookie support
    await fastify.register(cookie, {
        secret: config.jwt.accessSecret, // For signed cookies
        parseOptions: {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            path: config.cookie.path,
        },
    });

    fastify.log.info('Cookie support configured');

    // JWT for access tokens
    await fastify.register(jwt, {
        secret: config.jwt.accessSecret,
        cookie: {
            cookieName: 'access_token',
            signed: false,
        },
        sign: {
            expiresIn: config.jwt.accessExpiresIn,
        },
        verify: {
            extractToken: (request) => {
                // Try to get token from cookie first, then authorization header
                const cookieToken = request.cookies.access_token;
                if (cookieToken) return cookieToken;

                const authHeader = request.headers.authorization;
                if (authHeader?.startsWith('Bearer ')) {
                    return authHeader.slice(7);
                }
                return null;
            },
        },
    });

    // Decorator for verifying refresh tokens (uses different secret)
    fastify.decorate('verifyRefreshToken', async (token) => {
        try {
            const decoded = fastify.jwt.verify(token, {
                key: config.jwt.refreshSecret
            });
            return decoded;
        } catch (error) {
            return null;
        }
    });

    // Decorator for signing refresh tokens
    fastify.decorate('signRefreshToken', (payload) => {
        return fastify.jwt.sign(payload, {
            key: config.jwt.refreshSecret,
            expiresIn: config.jwt.refreshExpiresIn,
        });
    });

    // Helper to set auth cookies
    fastify.decorate('setAuthCookies', (reply, accessToken, refreshToken) => {
        // Debug log with environment info
        console.log('[COOKIE DEBUG] Setting cookies:', {
            refreshTokenPreview: `${refreshToken.substring(0, 8)}...`,
            accessTokenPreview: `${accessToken.substring(0, 20)}...`,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            nodeEnv: config.nodeEnv,
        });

        // Access token cookie (short-lived)
        reply.setCookie('access_token', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60, // 15 minutes
        });

        // Refresh token cookie (long-lived)
        reply.setCookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        // Log the Set-Cookie headers being sent
        const setCookieHeaders = reply.getHeader('Set-Cookie');
        console.log('[COOKIE DEBUG] Set-Cookie headers:', setCookieHeaders);
    });

    // Helper to clear auth cookies
    fastify.decorate('clearAuthCookies', (reply) => {
        reply.clearCookie('access_token', { path: '/' });
        reply.clearCookie('refresh_token', { path: '/' });
    });

    fastify.log.info('JWT authentication configured');
}

export default fp(authPlugin, {
    name: 'auth',
});
