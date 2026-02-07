// Check mobile access middleware - Ensure BASIC plan users cannot access via mobile
import { ForbiddenError } from '../utils/errors.js';
import { LogService } from '../services/logs.service.js';

export function checkMobileAccess(prisma) {
    const logService = new LogService(prisma);

    return async (request, reply) => {
        const clientType = request.headers['x-client-type'];

        if (clientType === 'MOBILE') {
            const companyId = request.companyId;

            if (!companyId) {
                throw new ForbiddenError('Company context required');
            }

            const company = await prisma.company.findUnique({
                where: { id: companyId },
                include: { plan: true },
            });

            if (!company || !company.plan) {
                throw new ForbiddenError('Invalid company or plan');
            }

            if (company.plan.key !== 'PREMIUM') {
                // Log the forbidden attempt
                await logService.logForbiddenMobileLogin(
                    request.user,
                    company.plan.key,
                    request.ip,
                    request.headers['user-agent'] || '',
                    request.headers['x-device-id'] || null
                );

                throw new ForbiddenError(
                    'Mobile access requires PREMIUM plan. Please upgrade your subscription.'
                );
            }
        }
    };
}
