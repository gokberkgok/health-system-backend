// Prisma client plugin for Fastify
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

async function prismaPlugin(fastify, options) {
    const prisma = new PrismaClient({
        log: fastify.config?.isProduction
            ? ['error']
            : ['query', 'info', 'warn', 'error'],
    });

    // Connect on startup
    await prisma.$connect();
    fastify.log.info('Database connected');

    // Decorate fastify with prisma client
    fastify.decorate('prisma', prisma);

    // Close connection on shutdown
    fastify.addHook('onClose', async (instance) => {
        await instance.prisma.$disconnect();
        fastify.log.info('Database disconnected');
    });
}

export default fp(prismaPlugin, {
    name: 'prisma',
});
