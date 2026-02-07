// Device Repository - Data access for devices
import { withTenantFilter } from '../middlewares/tenantContext.js';

export class DeviceRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    /**
     * Get all devices for a company
     */
    async findAll(companyId) {
        const devices = await this.prisma.device.findMany({
            where: withTenantFilter(companyId, {}),
            orderBy: { name: 'asc' },
        });
        return devices;
    }

    /**
     * Get device by ID
     */
    async findById(id, companyId) {
        const device = await this.prisma.device.findFirst({
            where: withTenantFilter(companyId, {
                id: id,
            }),
        });
        return device;
    }

    /**
     * Get device by name
     */
    async findByName(name, companyId) {
        const device = await this.prisma.device.findFirst({
            where: withTenantFilter(companyId, {
                name: name,
            }),
        });
        return device;
    }

    /**
     * Create a new device
     */
    async create(companyId, data) {
        const device = await this.prisma.device.create({
            data: {
                companyId: companyId,
                name: data.name,
                deviceCount: data.deviceCount || 1,
            },
        });
        return this.transformDevice(device);
    }

    /**
     * Update device
     */
    async update(id, companyId, data) {
        const device = await this.prisma.device.update({
            where: {
                id: id,
            },
            data: {
                deviceCount: data.deviceCount,
            },
        });
        return this.transformDevice(device);
    }

    /**
     * Delete device (hard delete) - also deletes related appointment_devices and orphaned appointments
     */
    async delete(id, companyId) {
        // Verify device belongs to company
        const device = await this.findById(id, companyId);
        if (!device) return null;

        // Find all appointments that use this device
        const appointmentDevices = await this.prisma.appointmentDevice.findMany({
            where: {
                deviceId: id,
                appointment: {
                    companyId: companyId,
                },
            },
            select: {
                appointmentId: true,
            },
        });

        // Delete the device (this will cascade delete appointment_devices due to foreign key)
        await this.prisma.device.delete({
            where: { id: id },
        });

        // Check each affected appointment - if it has no more devices, delete the appointment
        const uniqueAppointmentIds = [...new Set(appointmentDevices.map(ad => ad.appointmentId))];

        for (const appointmentId of uniqueAppointmentIds) {
            const remainingDevices = await this.prisma.appointmentDevice.count({
                where: { appointmentId },
            });

            if (remainingDevices === 0) {
                // No more devices in this appointment, delete it
                await this.prisma.appointment.delete({
                    where: { id: appointmentId },
                });
            }
        }

        return device;
    }

    /**
     * Check device capacity availability
     */
    async checkDeviceConflicts(companyId, devices, excludeAppointmentId = null) {
        const conflicts = [];

        for (const device of devices) {
            const deviceRecord = await this.findByName(device.deviceName, companyId);

            if (!deviceRecord) {
                continue;
            }

            const overlappingAppointments = await this.prisma.appointmentDevice.findMany({
                where: {
                    deviceName: device.deviceName,
                    appointment: {
                        companyId: companyId,
                        status: { not: 'cancelled' },
                        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
                    },
                    OR: [
                        {
                            startTime: { lte: new Date(device.startTime) },
                            endTime: { gt: new Date(device.startTime) },
                        },
                        {
                            startTime: { lt: new Date(device.endTime) },
                            endTime: { gte: new Date(device.endTime) },
                        },
                        {
                            startTime: { gte: new Date(device.startTime) },
                            endTime: { lte: new Date(device.endTime) },
                        },
                    ],
                },
                include: {
                    appointment: {
                        include: {
                            customer: { select: { fullName: true } },
                        },
                    },
                },
            });

            if (overlappingAppointments.length >= deviceRecord.deviceCount) {
                conflicts.push({
                    deviceName: device.deviceName,
                    conflictingAppointmentId: overlappingAppointments[0].appointment.id,
                    customerName: overlappingAppointments[0].appointment.customer.fullName,
                    startTime: overlappingAppointments[0].startTime,
                    endTime: overlappingAppointments[0].endTime,
                    deviceCapacity: deviceRecord.deviceCount,
                    currentBookings: overlappingAppointments.length,
                });
            }
        }

        return conflicts;
    }
}

export default DeviceRepository;
