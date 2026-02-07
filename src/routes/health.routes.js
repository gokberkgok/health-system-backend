// Health check routes - Public endpoints for monitoring
export default async function healthRoutes(fastify, options) {
    // GET /health - Basic health check
    fastify.get('/', {
        handler: async (request, reply) => {
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            };
        },
    });

    // GET /health/ready - Readiness check (includes database)
    fastify.get('/ready', {
        handler: async (request, reply) => {
            try {
                // Check database connection
                await fastify.prisma.$queryRaw`SELECT 1`;

                return {
                    status: 'ready',
                    timestamp: new Date().toISOString(),
                    checks: {
                        database: 'connected',
                    },
                };
            } catch (error) {
                reply.code(503);
                return {
                    status: 'not_ready',
                    timestamp: new Date().toISOString(),
                    checks: {
                        database: 'disconnected',
                    },
                };
            }
        },
    });

    // GET /health/live - Liveness check
    fastify.get('/live', {
        handler: async (request, reply) => {
            return {
                status: 'alive',
                timestamp: new Date().toISOString(),
            };
        },
    });
}
