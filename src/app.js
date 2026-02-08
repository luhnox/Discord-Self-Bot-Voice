/**
 * Discord Self-Bot Voice Application
 * Main orchestration module
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log, cleanupOldLogs } = require('./utils/logger');
const { validateConfig, getTokens } = require('./config/config');
const { startClient } = require('./core/client');
const { LOG_CLEANUP_INTERVAL_MS } = require('./utils/constants');

/**
 * Check for updates from GitHub repository
 */
async function checkForUpdates() {
    const repo = 'luhnox/Discord-Self-Bot-Voice';
    const url = `https://raw.githubusercontent.com/${repo}/main/package.json`;

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    log('ERROR', `Failed to check for updates: HTTP ${res.statusCode}`);
                    resolve();
                    return;
                }

                try {
                    const remotePackage = JSON.parse(data);
                    const remoteVersion = remotePackage.version;
                    const localVersion = require('../package.json').version;

                    if (remoteVersion !== localVersion) {
                        log('INFO', `New version available: ${remoteVersion} (current: ${localVersion}). Updating...`);
                        exec('git pull', (err, stdout, stderr) => {
                            if (err) {
                                log('ERROR', `Failed to update: ${err}`);
                                resolve();
                            } else {
                                log('INFO', 'Update successful. Please restart the application to use the new version.');
                                // Note: Not exiting automatically to avoid interrupting user
                                resolve();
                            }
                        });
                    } else {
                        log('INFO', 'Version is up to date.');
                        resolve();
                    }
                } catch (e) {
                    log('ERROR', `Error parsing update response: ${e}`);
                    resolve();
                }
            });
        }).on('error', (err) => {
            log('ERROR', `Failed to check for updates: ${err}`);
            resolve();
        });
    });
}

/**
 * Start the Discord bot application
 */
async function start() {
    // Check for updates first
    await checkForUpdates();

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