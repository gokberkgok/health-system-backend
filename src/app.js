// Main Fastify Application
import Fastify from 'fastify';
import config from './config/index.js';
import logger from './utils/logger.js';
import { formatError, AppError } from './utils/errors.js';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import securityPlugin from './plugins/security.js';
import authPlugin from './plugins/auth.js';

import {
    authRoutes,
    customersRoutes,
    appointmentsRoutes,
    dashboardRoutes,
    healthRoutes,
    devicesRoutes,
    paymentsRoutes,
    notificationsRoutes,
    reportsRoutes
} from './routes/index.js';

// Repositories
import {
    UserRepository,
    RefreshTokenRepository,
    CustomerRepository,
    DeviceRepository,
    AppointmentRepository,
    PaymentRepository,
    NotificationsRepository
} from './repositories/index.js';

// Services
import {
    AuthService,
    CustomerService,
    AppointmentService,
    DashboardService,
    PaymentService,
    DeviceService,
    NotificationsService,
    ReportsService
} from './services/index.js';

// Controllers
import {
    AuthController,
    CustomersController,
    AppointmentsController,
    DashboardController,
    PaymentController,
    DeviceController,
    NotificationsController,
    ReportsController
} from './controllers/index.js';

async function buildApp() {
    const fastify = Fastify({
        logger: {
            level: config.isProduction ? 'info' : 'debug',
            transport: config.isProduction
                ? undefined
                : {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                },
        },
        trustProxy: true, // Trust Cloudflare/Nginx proxy headers
    });

    // Add config to fastify instance
    fastify.decorate('config', config);

    // Register plugins
    await fastify.register(prismaPlugin);
    await fastify.register(securityPlugin);
    await fastify.register(authPlugin);

    // Initialize repositories
    const userRepository = new UserRepository(fastify.prisma);
    const refreshTokenRepository = new RefreshTokenRepository(fastify.prisma);
    const customerRepository = new CustomerRepository(fastify.prisma);
    const deviceRepository = new DeviceRepository(fastify.prisma);
    const appointmentRepository = new AppointmentRepository(fastify.prisma);
    const paymentRepository = new PaymentRepository(fastify.prisma);
    const notificationsRepository = new NotificationsRepository(fastify.prisma);

    // Initialize services
    const authService = new AuthService(
        userRepository,
        refreshTokenRepository,
        fastify
    );
    const customerService = new CustomerService(customerRepository);
    const appointmentService = new AppointmentService(
        appointmentRepository,
        customerRepository,
        deviceRepository
    );
    const dashboardService = new DashboardService(
        customerRepository,
        appointmentRepository
    );
    const paymentService = new PaymentService(paymentRepository, customerRepository);
    const deviceService = new DeviceService(deviceRepository);
    const notificationsService = new NotificationsService(notificationsRepository);
    const reportsService = new ReportsService(
        paymentRepository,
        appointmentRepository,
        customerRepository
    );

    // Set message dependencies on customerService
    customerService.setMessageDependencies(appointmentRepository, paymentRepository);

    // Initialize controllers
    const authController = new AuthController(authService, userRepository, fastify);
    const customersController = new CustomersController(customerService);
    const appointmentsController = new AppointmentsController(appointmentService);
    const dashboardController = new DashboardController(dashboardService);
    const paymentController = new PaymentController(paymentService);
    const deviceController = new DeviceController(deviceService);
    const notificationsController = new NotificationsController(notificationsService);
    const reportsController = new ReportsController(reportsService);

    // Register routes
    await fastify.register(healthRoutes, { prefix: '/health' });
    await fastify.register(authRoutes, {
        prefix: '/api/auth',
        authController,
    });
    await fastify.register(customersRoutes, {
        prefix: '/api/customers',
        customersController,
    });
    await fastify.register(appointmentsRoutes, {
        prefix: '/api/appointments',
        appointmentsController,
    });
    await fastify.register(dashboardRoutes, {
        prefix: '/api/dashboard',
        dashboardController,
    });
    await fastify.register(paymentsRoutes, {
        prefix: '/api/payments',
        paymentController,
    });
    await fastify.register(devicesRoutes, {
        prefix: '/api/devices',
        deviceController,
    });
    await fastify.register(notificationsRoutes, {
        prefix: '/api/notifications',
        notificationsController,
    });
    await fastify.register(reportsRoutes, {
        prefix: '/api/reports',
        reportsController,
    });

    // Global error handler
    fastify.setErrorHandler((error, request, reply) => {
        // Log the error
        fastify.log.error({
            err: error,
            request: {
                method: request.method,
                url: request.url,
                params: request.params,
                query: request.query,
            },
        });

        // Determine status code
        const statusCode = error instanceof AppError
            ? error.statusCode
            : (error.statusCode || 500);

        // Send formatted error response
        reply.code(statusCode).send(formatError(error));
    });

    // 404 handler
    fastify.setNotFoundHandler((request, reply) => {
        reply.code(404).send({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: `Route ${request.method} ${request.url} not found`,
            },
        });
    });

    return fastify;
}

// Start the server
async function start() {
    try {
        const fastify = await buildApp();

        await fastify.listen({
            port: config.port,
            host: config.host,
        });

        logger.info(`Server running on http://${config.host}:${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
    } catch (error) {
        logger.error(error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Shutting down gracefully...');
    process.exit(0);
});

start();
