export default async function healthRoutes(fastify) {
    // Common headers for health endpoints
    const noCacheHeaders = {
        'Cache-Control': 'no-store',
    };

    // GET /health
    // Basic health check
    fastify.get('/', async (request, reply) => {
        reply.headers(noCacheHeaders);

        return {
            status: 'ok',
            service: 'backend',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });

    // GET /health/live
    // Liveness check
    fastify.get('/live', async (request, reply) => {
        reply.headers(noCacheHeaders);

        return {
            status: 'alive',
            timestamp: new Date().toISOString(),
        };
    });

    // GET /health/ready
    // Readiness check (database included)
    fastify.get('/ready', async (request, reply) => {
        reply.headers(noCacheHeaders);

        try {
            // DB ping
            await fastify.prisma.$queryRaw`SELECT 1`;

            return {
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'connected',
                },
            };
        } catch (error) {
            request.log.error(error, 'Database readiness check failed');

            reply.code(503);

            return {
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'disconnected',
                },
            };
        }
    });
}