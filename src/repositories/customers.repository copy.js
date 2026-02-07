// Customer repository - Database operations for customers
import { withTenantFilter } from '../middlewares/tenantContext.js';

export class CustomerRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async findById(id, companyId) {
        return this.prisma.customer.findFirst({
            where: withTenantFilter(companyId, { id: id }),
        });
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
            }),
            this.prisma.customer.count({ where }),
        ]);

        return { customers, total, page, limit };
    }

    async create(companyId, data) {
        return this.prisma.customer.create({
            data: {
                companyId: companyId,
                fullName: data.fullName,
                tcIdentity: data.tcIdentity,
                birthDate: data.birthDate ? new Date(data.birthDate) : null,
                gender: data.gender,
                heightCm: data.heightCm,
                phone: data.phone,
                total_debt: data.total_debt,
                notes: data.notes,
            },
        });
    }

    async update(id, companyId, data) {
        // Verify customer belongs to company
        const customer = await this.findById(id, companyId);
        if (!customer) return null;

        return this.prisma.customer.update({
            where: { id: id },
            data: {
                fullName: data.fullName,
                tcIdentity: data.tcIdentity,
                birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
                gender: data.gender,
                heightCm: data.heightCm,
                phone: data.phone,
                notes: data.notes,
            },
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
            where: { id: id },
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
