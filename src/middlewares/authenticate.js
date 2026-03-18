// Authentication middleware - JWT verification
import { UnauthorizedError } from '../utils/errors.js';

function mapUser(payload) {
    return {
        id: payload.sub,
        companyId: payload.companyId,
        email: payload.email,
        role: payload.role,
    };
}

function isTokenExpiredError(error) {
    return error?.name === 'TokenExpiredError'
        || error?.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED'
        || error?.code === 'FAST_JWT_EXPIRED';
}

function getRefreshToken(request) {
    const cookieToken = request.cookies?.refresh_token;
    if (cookieToken) return cookieToken;

    const headerToken = request.headers['x-refresh-token'] || request.headers['refresh-token'];
    if (headerToken) return headerToken;

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

/**
 * Middleware to verify JWT access token and attach user to request
 */
export async function authenticate(request, reply) {
    try {
        // This will throw if token is invalid/expired
        await request.jwtVerify();

        // Attach user info to request for easy access
        request.user = mapUser(request.user);
    } catch (error) {
        if (!isTokenExpiredError(error)) {
            throw new UnauthorizedError('Invalid access token');
        }

        const refreshToken = getRefreshToken(request);
        if (!refreshToken) {
            throw new UnauthorizedError('Refresh token required. Please login again.');
        }

        let refreshResult;
        try {
            refreshResult = await request.server.authService.refresh(refreshToken);
        } catch (refreshError) {
            throw new UnauthorizedError('Invalid or expired refresh token. Please login again.');
        }

        const newAccessToken = refreshResult.accessToken;

        reply.header('x-new-access-token', newAccessToken);
        request.server.setAuthCookies(reply, refreshResult.accessToken, refreshResult.refreshToken);

        const verifiedPayload = request.server.jwt.verify(newAccessToken);
        request.user = mapUser(verifiedPayload);

        return;
    }
}

/**
 * Optional authentication - doesn't throw if no token
 */
export async function optionalAuthenticate(request, reply) {
    try {
        await request.jwtVerify();
        request.user = mapUser(request.user);
    } catch (error) {
        // Token is optional, so we don't throw
        request.user = null;
    }
}
