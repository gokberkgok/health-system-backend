// Dashboard controller - HTTP handlers for dashboard
export class DashboardController {
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }

    /**
     * GET /api/dashboard
     */
    async getStats(request, reply) {
        const result = await this.dashboardService.getStats(request.companyId);

        return {
            success: true,
            data: result,
        };
    }
}

export default DashboardController;
