/**
 * Discord Self-Bot Voice Application
 * Main orchestration module
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log, cleanupOldLogs } = require('./utils/logger');
const { validateDatabase, getAllTokens } = require('./config/database');
const { startClient } = require('./core/client');
const { LOG_CLEANUP_INTERVAL_MS } = require('./utils/constants');

/**
 * Check for updates from GitHub repository and enforce version matching
 */
async function checkForUpdates() {
    const repo = 'luhnox/Discord-Self-Bot-Voice';
    const url = `https://raw.githubusercontent.com/${repo}/main/package.json`;

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    log('ERROR', `Failed to check for updates: HTTP ${res.statusCode}`);
                    log('ERROR', 'Cannot verify version. Please check your internet connection.');
                    reject(new Error('Version check failed'));
                    return;
                }

                try {
                    const remotePackage = JSON.parse(data);
                    const remoteVersion = remotePackage.version;
                    const localVersion = require('../package.json').version;

                    if (remoteVersion !== localVersion) {
                        log('ERROR', `Version mismatch! Local: ${localVersion}, Remote: ${remoteVersion}`);
                        log('ERROR', 'Please update to the latest version by running: git pull');
                        log('ERROR', 'The application cannot run with an outdated version.');
                        reject(new Error('Version mismatch - update required'));
                    } else {
                        log('INFO', `Version verified: ${localVersion}`);
                        resolve();
                    }
                } catch (e) {
                    log('ERROR', `Error parsing update response: ${e}`);
                    reject(new Error('Version check failed'));
                }
            });
        }).on('error', (err) => {
            log('ERROR', `Failed to check for updates: ${err}`);
            log('ERROR', 'Cannot verify version. Please check your internet connection.');
            reject(new Error('Version check failed'));
        });
    });
}

/**
 * Start the Discord bot application
 */
async function start() {
    try {
        // Check for updates first and enforce version matching
        await checkForUpdates();

        // Validate database
        if (!validateDatabase()) {
            log('ERROR', 'Database validation failed. Exiting...');
            process.exit(1);
        }

        // Setup log cleanup
        cleanupOldLogs();
        setInterval(cleanupOldLogs, LOG_CLEANUP_INTERVAL_MS);

        const tokens = getAllTokens();
        const clients = [];

        if (tokens.length === 0) {
            log('ERROR', 'No valid tokens found in config.json');
            process.exit(1);
        }

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
        tokens.forEach(({ token, userid, config }) => {
            startClient(token, userid, config)
                .then(client => {
                    if (client) clients.push(client);
                })
                .catch(err => {
                    log('ERROR', `[${userid}] Failed to start client: ${err}`);
                });
        });
    } catch (error) {
        log('ERROR', `Application startup failed: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { start };
