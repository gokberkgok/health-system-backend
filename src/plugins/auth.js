// Authentication plugin: JWT with cookies
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import config from '../config/index.js';

async function authPlugin(fastify, options) {
    // Cookie support
    await fastify.register(cookie, {
        secret: config.jwt.accessSecret, // For signed cookies (optional)
        // parseOptions is only for parsing incoming cookies, NOT for setting them
        parseOptions: {},
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
        // Set cookies using raw Set-Cookie headers (more reliable for cross-origin)
        const accessTokenMaxAge = 15 * 60; // 15 minutes
        const refreshTokenMaxAge = 7 * 24 * 60 * 60; // 7 days
        
        const accessCookie = [
            `access_token=${accessToken}`,
            'HttpOnly',
            'Secure',
            'SameSite=None',
            'Path=/',
            `Max-Age=${accessTokenMaxAge}`
        ].join('; ');
        
        const refreshCookie = [
            `refresh_token=${refreshToken}`,
            'HttpOnly',
            'Secure',
            'SameSite=None',
            'Path=/',
            `Max-Age=${refreshTokenMaxAge}`
        ].join('; ');

        // Set both cookies as array
        reply.header('Set-Cookie', [accessCookie, refreshCookie]);

        // Debug log AFTER setting cookies
        const headers = reply.getHeaders();
        console.log('[COOKIE DEBUG] Cookies set:', {
            refreshTokenPreview: `${refreshToken.substring(0, 8)}...`,
            accessTokenPreview: `${accessToken.substring(0, 20)}...`,
            secure: true,
            sameSite: 'none',
            nodeEnv: config.nodeEnv,
            setCookieHeader: headers['set-cookie'] || 'STILL NOT SET',
            allHeaders: Object.keys(headers),
        });
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
