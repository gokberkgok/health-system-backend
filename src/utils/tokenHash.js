// Token hashing utilities
import crypto from 'crypto';

/**
 * Hash a refresh token using SHA-256
 * @param {string} token - Plain text token
 * @returns {string} Hashed token
 */
export function hashToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

/**
 * Generate a cryptographically secure refresh token
 * @returns {string} Random 64-character hex token
 */
export function generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a random access token (for JWT signing)
 * @returns {string} Random token
 */
export function generateAccessToken() {
    return crypto.randomBytes(16).toString('hex');
}
