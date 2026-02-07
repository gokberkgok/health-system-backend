// PM2 Ecosystem Configuration for Production
// Environment configuration with validation
import 'dotenv/config';
module.exports = {
    apps: [
        {
            name: 'health-saas-api',
            script: 'src/app.js',
            instances: 'max', // Use all CPU cores
            exec_mode: 'cluster',

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: process.env.PORT,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: process.env.PORT,
            },

            // Logging
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Auto-restart on failure
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 1000,

            // Memory management
            max_memory_restart: '500M',

            // Monitoring
            watch: false,
            ignore_watch: ['node_modules', 'logs', '.git'],

            // Graceful shutdown
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,
        },
    ],
};
