// Authentication middleware - JWT verification
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Middleware to verify JWT access token and attach user to request
 */
export async function authenticate(request, reply) {
    try {
        // This will throw if token is invalid/expired
        await request.jwtVerify();

        // Attach user info to request for easy access
        request.user = {
            id: request.user.sub,
            companyId: request.user.companyId,
            email: request.user.email,
            role: request.user.role,
        };
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired access token');
    }
}

/**
 * Optional authentication - doesn't throw if no token
 */
export async function optionalAuthenticate(request, reply) {
    try {
        await request.jwtVerify();
        request.user = {
            id: request.user.sub,
            companyId: request.user.companyId,
            email: request.user.email,
            role: request.user.role,
        };
    } catch (error) {
        // Token is optional, so we don't throw
        request.user = null;
    }
}
