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
        
        const isProduction = process.env.NODE_ENV === 'production';
        const domain = isProduction ? '.wellasoft.com' : undefined; // Localhost'ta domain undefined olmalı

        const accessCookie = [
            `access_token=${accessToken}`,
            'HttpOnly',
            'Secure', // HTTPS şart
            'SameSite=None', // Farklı subdomainler (api. ve www.) konuşacağı için None kalmalı
            'Path=/',
            domain ? `Domain=${domain}` : '', // DİKKAT: https:// yok!
            `Max-Age=${accessTokenMaxAge}`
        ].filter(Boolean).join('; ');

        const refreshCookie = [
            `refresh_token=${refreshToken}`,
            'HttpOnly',
            'Secure',
            'SameSite=None',
            'Path=/',
            domain ? `Domain=${domain}` : '', // DİKKAT: https:// yok!
            `Max-Age=${refreshTokenMaxAge}`
        ].filter(Boolean).join('; ');

        reply.header('Set-Cookie', [accessCookie, refreshCookie]);

    });

    // Helper to clear auth cookies
    fastify.decorate('clearAuthCookies', (reply) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const domain = isProduction ? '.wellasoft.com' : undefined;

        // Clear cookies with same options as when they were set
        const clearOptions = {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            ...(domain && { domain }),
        };
        
        reply.clearCookie('access_token', clearOptions);
        reply.clearCookie('refresh_token', clearOptions);
    });

    fastify.log.info('JWT authentication configured');
}

export default fp(authPlugin, {
    name: 'auth',
});
