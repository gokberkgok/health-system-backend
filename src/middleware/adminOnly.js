// Admin-only middleware
import { ForbiddenError } from '../utils/errors.js';

export const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            throw new ForbiddenError('Authentication required');
        }

        if (req.user.role !== 'ADMIN') {
            throw new ForbiddenError('Admin access required');
        }

        next();
    } catch (error) {
        next(error);
    }
};

export default requireAdmin;
