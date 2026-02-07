// Device Service - Dynamic device names
import { AppError } from '../utils/errors.js';

export class DeviceService {
    constructor(deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    /**
     * Get all devices for a company
     */
    async getAll(companyId) {
        return this.deviceRepository.findAll(companyId);
    }

    /**
     * Get device by ID
     */
    async getById(id, companyId) {
        const device = await this.deviceRepository.findById(id, companyId);
        if (!device) {
            throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
        }
        return device;
    }

    /**
     * Create a new device - accepts any name (case-sensitive)
     */
    async create(companyId, data) {
        const { name, deviceCount } = data;

        // Validate device name is provided
        if (!name || !name.trim()) {
            throw new AppError('Device name is required', 400, 'INVALID_DEVICE_NAME');
        }

        // Check if device with exact same name already exists (case-sensitive)
        const existing = await this.deviceRepository.findByName(name.trim(), companyId);
        if (existing) {
            throw new AppError(
                'Device with this name already exists',
                409,
                'DEVICE_EXISTS'
            );
        }

        return this.deviceRepository.create(companyId, {
            name: name.trim(),
            deviceCount: deviceCount || 1,
        });
    }

    /**
     * Update device count
     */
    async update(id, companyId, data) {
        const device = await this.getById(id, companyId);

        return this.deviceRepository.update(id, companyId, {
            deviceCount: data.deviceCount,
        });
    }

    /**
     * Delete device (hard delete)
     */
    async delete(id, companyId) {
        const device = await this.getById(id, companyId);
        return this.deviceRepository.delete(id, companyId);
    }
}
