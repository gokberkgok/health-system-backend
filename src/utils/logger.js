// Pino logger configuration for structured logging
import pino from 'pino';
import config from '../config/index.js';

const loggerOptions = {
    level: config.isProduction ? 'info' : 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => ({ level: label }),
    },
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash'],
        remove: true,
    },
};

// Use pino-pretty in development for readable logs
const transport = config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    };

export const logger = pino(
    loggerOptions,
    transport ? pino.transport(transport) : undefined
);

export default logger;
