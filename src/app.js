/**
 * Discord Self-Bot Voice Application
 * Main orchestration module
 */

const { log, cleanupOldLogs } = require('./utils/logger');
const { validateConfig, getTokens } = require('./config/config');
const { startClient } = require('./core/client');
const { LOG_CLEANUP_INTERVAL_MS } = require('./utils/constants');

/**
 * Start the Discord bot application
 */
function start() {
    // Validate configuration
    if (!validateConfig()) {
        log('ERROR', 'Configuration validation failed. Exiting...');
        process.exit(1);
    }

    // Setup log cleanup
    cleanupOldLogs();
    setInterval(cleanupOldLogs, LOG_CLEANUP_INTERVAL_MS);

    const tokens = getTokens();
    const clients = [];

    // Handle unhandled promise rejections
    process.on('unhandledRejection', err => {
        log('ERROR', `UnhandledRejection: ${err}`);
    });

    // Graceful shutdown handler
    async function gracefulShutdown() {
        log('INFO', 'Graceful shutdown initiated...');
        try {
            for (const client of clients) {
                if (client && client.destroy) {
                    await client.destroy();
                }
            }
            log('INFO', 'All Discord clients disconnected');
        } catch (err) {
            log('ERROR', `Error during graceful shutdown: ${err}`);
        }
        process.exit(0);
    }

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    // Start all configured clients
    tokens.forEach(({ token, label }) => {
        startClient(token, label)
            .then(client => {
                if (client) clients.push(client);
            })
            .catch(err => {
                log('ERROR', `[${label}] Failed to start client: ${err}`);
            });
    });
}

module.exports = { start };