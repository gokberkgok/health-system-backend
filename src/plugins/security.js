// Security plugins: Helmet, CORS, Rate Limiting
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import config from '../config/index.js';

async function securityPlugin(fastify, options) {
    // Helmet - Security headers
    await fastify.register(helmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: config.isProduction ? [] : null,
            },
        },
        crossOriginEmbedderPolicy: false, // Required for some external resources
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-origin' },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts: config.isProduction ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        } : false,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true,
    });

    fastify.log.info('Helmet security headers configured');

    // CORS - Strict configuration for frontend only
    const allowedOrigins = [
        config.frontendUrl,
        'https://5e38fcbc.health-system-frontend.pages.dev',
        'https://health-system-frontend.pages.dev'
    ].filter(Boolean); // Remove null/undefined values

    console.log('[CORS DEBUG] Allowed origins:', allowedOrigins);

    await fastify.register(cors, {
        origin: (origin, callback) => {
            console.log('[CORS DEBUG] Request from origin:', origin);
            // Allow requests with no origin (e.g., mobile apps, Postman, curl)
            if (!origin) {
                callback(null, true);
                return;
            }
            // Check if origin is in allowed list
            if (allowedOrigins.includes(origin)) {
                console.log('[CORS DEBUG] Origin allowed:', origin);
                callback(null, true);
            } else {
                console.log('[CORS DEBUG] Origin REJECTED:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With'],
        exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
        maxAge: 86400, // 24 hours
    });

    fastify.log.info(`CORS configured for: ${allowedOrigins.join(', ')}`);

    // Global Rate Limiting
    await fastify.register(rateLimit, {
        global: true,
        max: config.rateLimit.global.max,
        timeWindow: config.rateLimit.global.timeWindow,
        keyGenerator: (request) => {
            // Use X-Forwarded-For header from Cloudflare/Nginx
            return request.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || request.headers['x-real-ip']
                || request.ip;
        },
        errorResponseBuilder: (request, context) => ({
            success: false,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
                retryAfter: Math.ceil(context.ttl / 1000),
            },
        }),
    });

    fastify.log.info('Rate limiting configured');
}

export default fp(securityPlugin, {
    name: 'security',
});
