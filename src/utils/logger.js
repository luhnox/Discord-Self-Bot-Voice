const fs = require('fs');
const path = require('path');

const LOG_DIR = './logs';
const LOG_FILE = path.join(LOG_DIR, `discord-bot-${new Date().toISOString().split('T')[0]}.log`);

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Log a message to console and file
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} message - Message to log
 */
function log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logMessage);
    
    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

/**
 * Get log retention days from environment or use default
 * @returns {number} Number of days to retain logs
 */
function getLogRetentionDays() {
    const raw = process.env.LOG_RETENTION_DAYS;
    const days = raw ? Number(raw) : 7;
    if (!Number.isFinite(days) || days < 1) return 7;
    return Math.floor(days);
}

/**
 * Clean up old log files based on retention policy
 */
function cleanupOldLogs() {
    try {
        if (!fs.existsSync(LOG_DIR)) return;
        const retentionDays = getLogRetentionDays();
        const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

        const files = fs.readdirSync(LOG_DIR);
        for (const file of files) {
            const fullPath = path.join(LOG_DIR, file);
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) continue;
            if (stat.mtimeMs < cutoffMs) {
                fs.unlinkSync(fullPath);
                log('INFO', `Deleted old log file: ${file}`);
            }
        }
    } catch (err) {
        log('WARN', `Failed to cleanup logs: ${err.message}`);
    }
}

module.exports = {
    log,
    getLogRetentionDays,
    cleanupOldLogs
};
