// User repository - Database operations for users
import { withTenantFilter } from '../middlewares/tenantContext.js';

export class UserRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id: id },
            include: {
                company: {
                    include: { plan: true },
                },
            },
        });
    }

    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                company: {
                    include: { plan: true },
                },
            },
        });
    }

    async findByCompany(companyId, options = {}) {
        const { page = 1, limit = 20, search } = options;
        const skip = (page - 1) * limit;

        const where = withTenantFilter(companyId, {
            ...(search && {
                OR: [
                    { email: { contains: search } },
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                ],
            }),
        });

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return { users, total, page, limit };
    }

    async create(data) {
        return this.prisma.user.create({
            data: {
                companyId: data.companyId,
                email: data.email.toLowerCase(),
                passwordHash: data.passwordHash,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role || 'USER',
            },
        });
    }

    async update(id, companyId, data) {
        // Verify user belongs to company
        const user = await this.prisma.user.findFirst({
            where: withTenantFilter(companyId, { id: id }),
        });

        if (!user) return null;

        return this.prisma.user.update({
            where: { id: id },
            data,
        });
    }

    async delete(id, companyId) {
        // Verify user belongs to company
        const user = await this.prisma.user.findFirst({
            where: withTenantFilter(companyId, { id: id }),
        });

        if (!user) return null;

        return this.prisma.user.delete({
            where: { id: id },
        });
    }

    async countByCompany(companyId) {
        return this.prisma.user.count({
            where: { companyId: companyId },
        });
    }
}

export default UserRepository;
