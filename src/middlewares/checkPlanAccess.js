// Plan Access Middleware - Check if company's plan has access to feature
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Check if company's plan has access to feature
 * @param {...string} requiredPlans - Plan keys that have access (e.g., 'PREMIUM')
 * @returns {Function} Fastify preHandler function
 */
export function checkPlanAccess(...requiredPlans) {
    return async (request, reply) => {
        const companyId = request.companyId;

        if (!companyId) {
            throw new UnauthorizedError('Company ID is required');
        }

        // Get company with plan info
        const company = await request.server.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                plan: true,
            },
        });

        if (!company || !company.plan) {
            throw new UnauthorizedError('Invalid company or plan');
        }

        // Check if plan is active
        if (!company.plan.isActive) {
            throw new UnauthorizedError('Your plan is not active');
        }

        // Check if plan has access
        if (!requiredPlans.includes(company.plan.key)) {
            throw new UnauthorizedError(
                `This feature requires ${requiredPlans.join(' or ')} plan. Your current plan: ${company.plan.name}`
            );
        }
    };
}
