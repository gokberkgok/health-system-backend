// Customer repository - Database operations for customers
import { withTenantFilter } from '../middlewares/tenantContext.js';

export class CustomerRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async findById(id, companyId) {
        const customer = await this.prisma.customer.findFirst({
            where: withTenantFilter(companyId, { id }),
        });
        if (customer && customer.totalDebt) {
            customer.totalDebt = parseFloat(customer.totalDebt);
        }
        return customer;
    }

    async findByTcIdentity(tcIdentity, companyId) {
        return this.prisma.customer.findFirst({
            where: withTenantFilter(companyId, { tcIdentity }),
        });
    }

    async findMany(companyId, options = {}) {
        const { page = 1, limit = 20, search, gender, isActive = true } = options;
        const skip = (page - 1) * limit;

        const where = withTenantFilter(companyId, {
            isActive,
            ...(search && {
                OR: [
                    { fullName: { contains: search } },
                    { tcIdentity: { contains: search } },
                    { phone: { contains: search } },
                ],
            }),
            ...(gender && { gender }),
        });

        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    fullName: true,
                    tcIdentity: true,
                    birthDate: true,
                    gender: true,
                    heightCm: true,
                    phone: true,
                    notes: true,
                    isActive: true,
                    createdAt: true,
                    totalDebt: true, // Include totalDebt
                },
            }),
            this.prisma.customer.count({ where }),
        ]);

        // Convert totalDebt to Number for all customers
        const transformedCustomers = customers.map(c => ({
            ...c,
            totalDebt: c.totalDebt ? parseFloat(c.totalDebt) : 0,
        }));

        return { customers: transformedCustomers, total, page, limit };
    }

    async create(companyId, data) {
        return this.prisma.customer.create({
            data: {
                companyId,
                fullName: data.fullName,
                tcIdentity: data.tcIdentity,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
                gender: data.gender,
                heightCm: data.heightCm,
                phone: data.phone,
                notes: data.notes,
                totalDebt: data.totalDebt,
            },
        });
    }

    async update(id, companyId, data) {
        // Verify customer belongs to company
        const customer = await this.findById(id, companyId);
        if (!customer) return null;

        // Prepare update data
        const updateData = {};
        if (typeof data.fullName !== 'undefined') updateData.fullName = data.fullName;
        if (typeof data.tcIdentity !== 'undefined') updateData.tcIdentity = data.tcIdentity;
        if (typeof data.birthDate !== 'undefined') updateData.birthDate = data.birthDate ? new Date(data.birthDate) : undefined;
        if (typeof data.gender !== 'undefined') updateData.gender = data.gender;
        if (typeof data.heightCm !== 'undefined') updateData.heightCm = data.heightCm;
        if (typeof data.phone !== 'undefined') updateData.phone = data.phone;
        if (typeof data.notes !== 'undefined') updateData.notes = data.notes;
        if (typeof data.totalDebt !== 'undefined') updateData.totalDebt = data.totalDebt;

        return this.prisma.customer.update({
            where: { id },
            data: updateData,
        });
    }

    async softDelete(id, companyId) {
        // Verify customer belongs to company
        const customer = await this.findById(id, companyId);
        if (!customer) return null;

        return this.prisma.customer.update({
            where: { id: id },
            data: { isActive: false },
        });
    }

    async hardDelete(id, companyId) {
        // Verify customer belongs to company
        const customer = await this.findById(id, companyId);
        if (!customer) return null;

        return this.prisma.customer.delete({
            where: { id },
        });
    }

    async count(companyId, options = {}) {
        const { isActive = true } = options;
        return this.prisma.customer.count({
            where: withTenantFilter(companyId, { isActive }),
        });
    }

    async getGenderStats(companyId) {
        const stats = await this.prisma.customer.groupBy({
            by: ['gender'],
            where: withTenantFilter(companyId, { isActive: true }),
            _count: true,
        });

        return stats.reduce((acc, { gender, _count }) => {
            acc[gender || 'unknown'] = _count;
            return acc;
        }, {});
    }

}

export default CustomerRepository;
