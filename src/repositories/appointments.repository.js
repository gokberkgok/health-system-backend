// Appointment repository - Database operations for appointments
import { withTenantFilter } from '../middlewares/tenantContext.js';
import { ConflictError } from '../utils/errors.js';

export class AppointmentRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async findById(id, companyId) {
        return this.prisma.appointment.findFirst({
            where: withTenantFilter(companyId, { id: id }),
            include: {
                customer: true,
                devices: true,
            },
        });
    }

    async findMany(companyId, options = {}) {
        const {
            page = 1,
            limit = 20,
            startDate,
            endDate,
            customerId,
            status,
            deviceName,
        } = options;
        const skip = (page - 1) * limit;

        const where = withTenantFilter(companyId, {
            ...(startDate && endDate && {
                startTime: { gte: new Date(startDate) },
                endTime: { lte: new Date(endDate) },
            }),
            ...(customerId && { customerId: customerId }),
            ...(status && { status }),
            ...(deviceName && {
                devices: { some: { deviceName } },
            }),
        });

        const [appointments, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { startTime: 'asc' },
                include: {
                    customer: {
                        select: { id: true, fullName: true, phone: true },
                    },
                    devices: true,
                },
            }),
            this.prisma.appointment.count({ where }),
        ]);

        return { appointments, total, page, limit };
    }

    async findByDateRange(companyId, startDate, endDate) {
        return this.prisma.appointment.findMany({
            where: withTenantFilter(companyId, {
                startTime: { gte: new Date(startDate) },
                endTime: { lte: new Date(endDate) },
                status: { not: 'cancelled' },
            }),
            orderBy: { startTime: 'asc' },
            include: {
                customer: {
                    select: { id: true, fullName: true, phone: true },
                },
                devices: true,
            },
        });
    }

    async findTodayAppointments(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.findByDateRange(companyId, today, tomorrow);
    }

    async findByCustomerId(customerId, companyId) {
        return this.prisma.appointment.findMany({
            where: withTenantFilter(companyId, {
                customerId: customerId,
            }),
            orderBy: { startTime: 'asc' },
            include: {
                customer: {
                    select: { id: true, fullName: true, phone: true },
                },
                devices: true,
            },
        });
    }


    /**
     * Check for device conflicts considering device count/capacity
     */
    async checkDeviceConflicts(companyId, devices, excludeAppointmentId = null) {
        const conflicts = [];

        for (const device of devices) {
            // Get device capacity
            const deviceRecord = await this.prisma.device.findFirst({
                where: withTenantFilter(companyId, { name: device.deviceName }),
            });

            if (!deviceRecord) {
                conflicts.push({
                    deviceName: device.deviceName,
                    error: 'Device not found',
                });
                continue;
            }

            const deviceCapacity = deviceRecord.deviceCount;

            // Count existing bookings in the time slot
            const existingBookings = await this.prisma.appointmentDevice.count({
                where: {
                    deviceName: device.deviceName,
                    appointment: withTenantFilter(companyId, {
                        status: { not: 'cancelled' },
                        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
                    }),
                    OR: [
                        {
                            // New slot starts during existing slot
                            startTime: { lte: new Date(device.startTime) },
                            endTime: { gt: new Date(device.startTime) },
                        },
                        {
                            // New slot ends during existing slot
                            startTime: { lt: new Date(device.endTime) },
                            endTime: { gte: new Date(device.endTime) },
                        },
                        {
                            // New slot completely contains existing slot
                            startTime: { gte: new Date(device.startTime) },
                            endTime: { lte: new Date(device.endTime) },
                        },
                    ],
                },
            });

            // Check if capacity is exceeded
            if (existingBookings >= deviceCapacity) {
                // Get one example conflict for error message
                const conflictExample = await this.prisma.appointmentDevice.findFirst({
                    where: {
                        deviceName: device.deviceName,
                        appointment: withTenantFilter(companyId, {
                            status: { not: 'cancelled' },
                            ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
                        }),
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
                            select: { id: true, customer: { select: { fullName: true } } },
                        },
                    },
                });

                conflicts.push({
                    deviceName: device.deviceName,
                    conflictingAppointmentId: conflictExample.appointment.id,
                    customerName: conflictExample.appointment.customer.fullName,
                    startTime: conflictExample.startTime,
                    endTime: conflictExample.endTime,
                    deviceCapacity,
                    currentBookings: existingBookings,
                });
            }
        }

        return conflicts;
    }

    // Müşteri randevu çakışması kontrolü (sadece appointments tablosu)
    async checkCustomerTimeConflict(companyId, customerId, startTime, endTime, excludeAppointmentId = null) {
        return this.prisma.appointment.findFirst({
            where: {
                ...withTenantFilter(companyId, {
                    customerId: customerId,
                    status: { not: 'cancelled' }, // Sadece iptal edilmemiş randevuları kontrol et
                    ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
                }),
                OR: [
                    {
                        // Yeni randevu mevcut randevunun başlangıcında
                        startTime: { lte: new Date(startTime) },
                        endTime: { gt: new Date(startTime) },
                    },
                    {
                        // Yeni randevu mevcut randevunun bitişinde
                        startTime: { lt: new Date(endTime) },
                        endTime: { gte: new Date(endTime) },
                    },
                    {
                        // Yeni randevu mevcut randevuyu tamamen kapsıyor
                        startTime: { gte: new Date(startTime) },
                        endTime: { lte: new Date(endTime) },
                    },
                ],
            },
            include: {
                customer: { select: { fullName: true } },
            },
        });
    }

    /**
     * Create appointment with transaction-safe device booking
     */
    async create(companyId, data) {
        return this.prisma.$transaction(async (tx) => {
            // Check for conflicts first
            const conflicts = await this.checkDeviceConflicts(companyId, data.devices);

            if (conflicts.length > 0) {
                throw new ConflictError(
                    `Device conflict: ${conflicts[0].deviceName} is already booked from ` +
                    `${conflicts[0].startTime.toISOString()} to ${conflicts[0].endTime.toISOString()}`
                );
            }

            // Get device IDs
            const deviceRecords = await tx.device.findMany({
                where: withTenantFilter(companyId, {
                    name: { in: data.devices.map((d) => d.deviceName) },
                }),
            });

            const deviceMap = new Map(deviceRecords.map((d) => [d.name, d.id]));

            // Create appointment with devices
            return tx.appointment.create({
                data: {
                    companyId: companyId,
                    customerId: data.customerId,
                    startTime: new Date(data.startTime),
                    endTime: new Date(data.endTime),
                    status: 'scheduled',
                    notes: data.notes,
                    devices: {
                        create: data.devices.map((device, index) => ({
                            deviceId: deviceMap.get(device.deviceName),
                            deviceName: device.deviceName,
                            startTime: new Date(device.startTime),
                            endTime: new Date(device.endTime),
                            sequence: index + 1,
                        })),
                    },
                },
                include: {
                    customer: true,
                    devices: true,
                },
            });
        });
    }

    /**
     * Update appointment (reschedule)
     */
    async update(id, companyId, data) {
        return this.prisma.$transaction(async (tx) => {
            // Get existing appointment
            const existing = await this.findById(id, companyId);
            if (!existing) {
                return null;
            }

            // If devices are being updated, check for conflicts
            if (data.devices && data.devices.length > 0) {
                const conflicts = await this.checkDeviceConflicts(
                    companyId,
                    data.devices,
                    id
                );

                if (conflicts.length > 0) {
                    throw new ConflictError(
                        `Device conflict: ${conflicts[0].deviceName} capacity exceeded (${conflicts[0].currentBookings}/${conflicts[0].deviceCapacity})`
                    );
                }

                // Delete old device assignments
                await tx.appointmentDevice.deleteMany({
                    where: { appointmentId: id },
                });

                // Get device IDs for new devices
                const deviceRecords = await tx.device.findMany({
                    where: withTenantFilter(companyId, {
                        name: { in: data.devices.map((d) => d.deviceName) },
                    }),
                });

                const deviceMap = new Map(deviceRecords.map((d) => [d.name, d.id]));

                // Create new device assignments
                await tx.appointmentDevice.createMany({
                    data: data.devices.map((device, index) => ({
                        appointmentId: id,
                        deviceId: deviceMap.get(device.deviceName),
                        deviceName: device.deviceName,
                        startTime: new Date(device.startTime),
                        endTime: new Date(device.endTime),
                        sequence: index + 1,
                    })),
                });
            }

            // Update appointment
            return tx.appointment.update({
                where: { id: id },
                data: {
                    ...(data.customerId && { customerId: data.customerId }),
                    ...(data.startTime && { startTime: new Date(data.startTime) }),
                    ...(data.endTime && { endTime: new Date(data.endTime) }),
                    ...(data.notes !== undefined && { notes: data.notes }),
                    ...(data.status && { status: data.status }),
                },
                include: {
                    customer: true,
                    devices: true,
                },
            });
        });
    }

    async updateStatus(id, companyId, status) {
        const appointment = await this.findById(id, companyId);
        if (!appointment) return null;

        return this.prisma.appointment.update({
            where: { id: id },
            data: { status },
        });
    }

    async cancel(id, companyId) {
        return this.updateStatus(id, companyId, 'cancelled');
    }

    async countToday(companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.prisma.appointment.count({
            where: withTenantFilter(companyId, {
                startTime: { gte: today, lt: tomorrow },
                status: { not: 'cancelled' },
            }),
        });
    }

    async getUpcoming(companyId, limit = 5) {
        const now = new Date();

        return this.prisma.appointment.findMany({
            where: withTenantFilter(companyId, {
                startTime: { gte: now },
                status: 'scheduled',
            }),
            take: limit,
            orderBy: { startTime: 'asc' },
            include: {
                customer: { select: { id: true, fullName: true, phone: true } },
                devices: true,
            },
        });
    }

    /**
     * Count appointments by date range
     */
    async countByDateRange(companyId, startDate, endDate) {
        return this.prisma.appointment.count({
            where: withTenantFilter(companyId, {
                startTime: { gte: new Date(startDate) },
                endTime: { lte: new Date(endDate) },
                status: { not: 'cancelled' },
            }),
        });
    }

    /**
     * Update appointment status
     */
    async updateStatus(id, companyId, status) {
        return this.prisma.appointment.update({
            where: {
                id: id,
            },
            data: {
                status,
            },
            include: {
                customer: {
                    select: { id: true, fullName: true, phone: true },
                },
                devices: true,
            },
        });
    }
}

export default AppointmentRepository;
