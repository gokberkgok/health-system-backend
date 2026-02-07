// Device Controller
export class DeviceController {
    constructor(deviceService) {
        this.deviceService = deviceService;
    }

    /**
     * Get all devices
     * GET /api/devices
     */
    async getAll(request, reply) {
        const companyId = request.companyId;
        const devices = await this.deviceService.getAll(companyId);

        return {
            success: true,
            data: devices,
        };
    }

    /**
     * Get device by ID
     * GET /api/devices/:id
     */
    async getById(request, reply) {
        const companyId = request.companyId;
        const { id } = request.params;

        const device = await this.deviceService.getById(id, companyId);

        return {
            success: true,
            data: device,
        };
    }

    /**
     * Create device
     * POST /api/devices
     */
    async create(request, reply) {
        const companyId = request.companyId;
        const device = await this.deviceService.create(companyId, request.body);

        reply.code(201);
        return {
            success: true,
            data: device,
        };
    }

    /**
     * Update device
     * PUT /api/devices/:id
     */
    async update(request, reply) {
        const companyId = request.companyId;
        const { id } = request.params;

        const device = await this.deviceService.update(id, companyId, request.body);

        return {
            success: true,
            data: device,
        };
    }

    /**
     * Delete device
     * DELETE /api/devices/:id
     */
    async delete(request, reply) {
        const companyId = request.companyId;
        const { id } = request.params;

        await this.deviceService.delete(id, companyId);

        return {
            success: true,
            message: 'Device deleted successfully',
        };
    }
}
