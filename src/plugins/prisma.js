import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

async function prismaPlugin(fastify) {
  await prisma.$connect();

  fastify.log.info('Database connected');

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    fastify.log.info('Database disconnected');
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
});