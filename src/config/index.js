// Environment configuration with validation
import 'dotenv/config';

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    accessExpiresInMs: 15 * 60 * 1000, // 15 minutes in ms
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },

  // CORS
  frontendUrl: process.env.FRONTEND_URL,

  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  // Rate Limiting
  rateLimit: {
    global: {
      max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_GLOBAL_WINDOW || '1 minute',
    },
    auth: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
      timeWindow: process.env.RATE_LIMIT_AUTH_WINDOW || '1 minute',
    },
  },

  // Cookies
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    // Use 'none' for production (cross-origin) and 'lax' for development  
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    path: '/',
  },
};

export default config;
