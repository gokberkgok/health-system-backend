// Reports routes - All routes require authentication and tenant context
import { authenticate, tenantContext, checkPlanAccess } from '../middlewares/index.js';

export default async function reportsRoutes(fastify, options) {
    const { reportsController } = options;

    // Apply auth, tenant context, and PREMIUM plan check to all routes
    fastify.addHook('preHandler', authenticate);
    fastify.addHook('preHandler', tenantContext);
    fastify.addHook('preHandler', checkPlanAccess('PREMIUM'));

    // GET /api/reports/daily-revenue?date=YYYY-MM-DD
    fastify.get('/daily-revenue', {
        handler: reportsController.getDailyRevenue.bind(reportsController),
    });

    // GET /api/reports/appointment-stats
    fastify.get('/appointment-stats', {
        handler: reportsController.getAppointmentStats.bind(reportsController),
    });

    // GET /api/reports/monthly-revenue?year=2026&month=2
    fastify.get('/monthly-revenue', {
        handler: reportsController.getMonthlyRevenue.bind(reportsController),
    });

    // GET /api/reports/top-devices?startDate=...&endDate=...&limit=5
    fastify.get('/top-devices', {
        handler: reportsController.getTopDevices.bind(reportsController),
    });

    // GET /api/reports/outstanding-debts?minAmount=0
    fastify.get('/outstanding-debts', {
        handler: reportsController.getOutstandingDebts.bind(reportsController),
    });

    // GET /api/reports/financial-summary?startDate=...&endDate=...
    fastify.get('/financial-summary', {
        handler: reportsController.getFinancialSummary.bind(reportsController),
    });
}

