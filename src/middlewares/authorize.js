// Role-based authorization middleware
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

// Role hierarchy - higher roles include lower role permissions
const ROLE_HIERARCHY = {
    USER: 1,
    STAFF: 2,
    ADMIN: 3,
};

/**
 * Create authorization middleware for specific roles
 * @param {string[]} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Fastify preHandler middleware
 */
export function authorize(...allowedRoles) {
    return async function authorizeHandler(request, reply) {
        // Check if user is authenticated
        if (!request.user) {
            throw new UnauthorizedError('Authentication required');
        }

        const userRole = request.user.role;

        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(userRole)) {
            throw new ForbiddenError(
                `Access denied. Required role: ${allowedRoles.join(' or ')}`
            );
        }
    };
}

/**
 * Authorize based on minimum role level (uses hierarchy)
 * @param {string} minRole - Minimum role required
 * @returns {Function} Fastify preHandler middleware
 */
export function authorizeMinRole(minRole) {
    return async function authorizeMinRoleHandler(request, reply) {
        if (!request.user) {
            throw new UnauthorizedError('Authentication required');
        }

        const userLevel = ROLE_HIERARCHY[request.user.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 999;

        if (userLevel < requiredLevel) {
            throw new ForbiddenError(`Access denied. Minimum role required: ${minRole}`);
        }
    };
}

/**
 * Authorize if user owns the resource or is admin
 * Requires resourceOwnerId to be set on request
 */
export function authorizeOwnerOrAdmin(getOwnerId) {
    return async function authorizeOwnerOrAdminHandler(request, reply) {
        if (!request.user) {
            throw new UnauthorizedError('Authentication required');
        }

        // Admins can access everything
        if (request.user.role === 'ADMIN') {
            return;
        }

        // Get owner ID from the provided function
        const ownerId = await getOwnerId(request);

        if (request.user.id !== ownerId) {
            throw new ForbiddenError('Access denied. You can only access your own resources.');
        }
    };
}
