// Input sanitization middleware
import { sanitizeObject } from '../utils/validators.js';

/**
 * Middleware to sanitize request body, query, and params
 * Removes HTML tags and trims whitespace from string values
 */
export async function sanitize(request, reply) {
    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
        request.body = sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query && typeof request.query === 'object') {
        request.query = sanitizeObject(request.query);
    }

    // Sanitize URL parameters
    if (request.params && typeof request.params === 'object') {
        request.params = sanitizeObject(request.params);
    }
}

export default sanitize;
