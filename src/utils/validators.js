// Input validation utilities
import sanitizeHtml from 'sanitize-html';

// Sanitize string input (remove HTML, trim whitespace)
export function sanitizeString(input) {
    if (typeof input !== 'string') return input;
    return sanitizeHtml(input.trim(), {
        allowedTags: [],
        allowedAttributes: {},
    });
}

// Recursively sanitize object values
export function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    }

    return obj;
}

// Validate Turkish TC Identity Number (11 digits with checksum)
export function validateTcIdentity(tc) {
    if (!tc || typeof tc !== 'string') return false;
    if (tc.length !== 11) return false;
    if (!/^\d{11}$/.test(tc)) return false;
    if (tc[0] === '0') return false;

    const digits = tc.split('').map(Number);

    // Algorithm for TC validation
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const check10 = (oddSum * 7 - evenSum) % 10;
    const check11 = (digits.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;

    return digits[9] === check10 && digits[10] === check11;
}

// Validate email format
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number (Turkish format)
export function validatePhone(phone) {
    if (!phone) return true; // Optional field
    // Allow formats: 05XX XXX XX XX, +90 5XX XXX XX XX, etc.
    const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Validate password strength
export function validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

// Validate date is not in the future
export function validateBirthDate(date) {
    if (!date) return true; // Optional field
    const birthDate = new Date(date);
    const now = new Date();
    return birthDate < now;
}
