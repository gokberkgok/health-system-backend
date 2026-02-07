// Tenant context middleware - enforces company_id isolation
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Middleware that attaches tenant (company) context to request
 * MUST be used after authenticate middleware
 * 
 * This ensures ALL database queries are scoped to the user's company
 */
export async function tenantContext(request, reply) {
    // User must be authenticated first
    if (!request.user) {
        throw new UnauthorizedError('Authentication required for tenant context');
    }

    // Ensure companyId is present
    if (!request.user.companyId) {
        throw new ForbiddenError('User is not associated with any company');
    }

    // Attach companyId as tenant context
    request.companyId = request.user.companyId;
}

/**
 * Validate that a resource belongs to the current tenant
 * Use this when accessing specific resources by ID
 */
export function validateTenantResource(resourceCompanyId, requestCompanyId) {
    if (resourceCompanyId !== requestCompanyId) {
        throw new ForbiddenError('Access denied. Resource belongs to another company.');
    }
}

/**
 * Create a Prisma where clause that includes tenant filter
 * Always use this when querying the database
 */
export function withTenantFilter(companyId, additionalFilters = {}) {
    return {
        companyId,
        ...additionalFilters,
    };
}

/**
 * Higher-order function to wrap repository methods with tenant isolation
 * Automatically injects companyId into all queries
 */
export function createTenantRepository(prismaModel, companyId) {
    return {
        findMany: (args = {}) => prismaModel.findMany({
            ...args,
            where: withTenantFilter(companyId, args.where),
        }),

        findFirst: (args = {}) => prismaModel.findFirst({
            ...args,
            where: withTenantFilter(companyId, args.where),
        }),

        findUnique: async (args) => {
            const result = await prismaModel.findUnique(args);
            if (result && result.companyId !== companyId) {
                throw new ForbiddenError('Access denied');
            }
            return result;
        },

        create: (args) => prismaModel.create({
            ...args,
            data: { ...args.data, companyId },
        }),

        update: async (args) => {
            // First verify resource belongs to tenant
            const existing = await prismaModel.findUnique({ where: args.where });
            if (!existing || existing.companyId !== companyId) {
                throw new ForbiddenError('Access denied');
            }
            return prismaModel.update(args);
        },

        delete: async (args) => {
            // First verify resource belongs to tenant
            const existing = await prismaModel.findUnique({ where: args.where });
            if (!existing || existing.companyId !== companyId) {
                throw new ForbiddenError('Access denied');
            }
            return prismaModel.delete(args);
        },

        count: (args = {}) => prismaModel.count({
            ...args,
            where: withTenantFilter(companyId, args.where),
        }),
    };
}
