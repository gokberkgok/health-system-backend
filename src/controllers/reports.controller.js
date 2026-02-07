// Reports controller - HTTP handlers for reports
export class ReportsController {
    constructor(reportsService) {
        this.reportsService = reportsService;
    }

    /**
     * GET /api/reports/daily-revenue?date=YYYY-MM-DD
     */
    async getDailyRevenue(request, reply) {
        const { date } = request.query;
        const companyId = request.companyId;

        if (!date) {
            reply.code(400);
            return {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Date is required' }
            };
        }

        const report = await this.reportsService.getDailyRevenue(companyId, date);

        return {
            success: true,
            data: report
        };
    }

    /**
     * GET /api/reports/appointment-stats
     */
    async getAppointmentStats(request, reply) {
        const companyId = request.companyId;

        const stats = await this.reportsService.getAppointmentStats(companyId);

        return {
            success: true,
            data: stats
        };
    }

    /**
     * GET /api/reports/monthly-revenue?year=2024&month=1
     */
    async getMonthlyRevenue(request, reply) {
        const { year, month } = request.query;
        const companyId = request.companyId;

        if (!year || !month) {
            reply.code(400);
            return {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Year and month are required' }
            };
        }

        const report = await this.reportsService.getMonthlyRevenue(
            companyId,
            parseInt(year),
            parseInt(month)
        );

        return {
            success: true,
            data: report
        };
    }

    /**
     * GET /api/reports/top-devices?startDate=...&endDate=...&limit=5
     */
    async getTopDevices(request, reply) {
        const { startDate, endDate, limit = 5 } = request.query;
        const companyId = request.companyId;

        if (!startDate || !endDate) {
            reply.code(400);
            return {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Start date and end date are required' }
            };
        }

        const devices = await this.reportsService.getTopDevices(
            companyId,
            startDate,
            endDate,
            parseInt(limit)
        );

        return {
            success: true,
            data: devices
        };
    }

    /**
     * GET /api/reports/outstanding-debts?minAmount=0
     */
    async getOutstandingDebts(request, reply) {
        const { minAmount = 0 } = request.query;
        const companyId = request.companyId;

        const debts = await this.reportsService.getOutstandingDebts(
            companyId,
            parseFloat(minAmount)
        );

        return {
            success: true,
            data: debts
        };
    }

    /**
     * GET /api/reports/financial-summary?startDate=...&endDate=...
     */
    async getFinancialSummary(request, reply) {
        const { startDate, endDate } = request.query;
        const companyId = request.companyId;

        if (!startDate || !endDate) {
            reply.code(400);
            return {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Start date and end date are required' }
            };
        }

        const summary = await this.reportsService.getFinancialSummary(
            companyId,
            startDate,
            endDate
        );

        return {
            success: true,
            data: summary
        };
    }
}

export default ReportsController;
