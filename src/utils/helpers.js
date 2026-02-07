/**
 * Helper utility functions
 */

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize a string value (trim and validate)
 * @param {*} value - Value to normalize
 * @returns {string|null} Normalized string or null
 */
function normalizeString(value) {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str.length > 0 ? str : null;
}

/**
 * Normalize a Discord channel ID
 * @param {*} value - Channel ID to normalize
 * @returns {string|null} Normalized channel ID or null
 */
function normalizeChannelId(value) {
    return normalizeString(value);
}

/**
 * Normalize a Discord token
 * @param {*} value - Token to normalize
 * @returns {string|null} Normalized token or null
 */
function normalizeToken(value) {
    return normalizeString(value);
}

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (1-based)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function getExponentialBackoffDelay(attempt, baseDelayMs = 2000, maxDelayMs = 60000) {
    const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
    return Math.floor(delay + Math.random() * 1000);
}

/**
 * Extract error code from various error formats
 * @param {Error} err - Error object
 * @returns {string|null} Error code or null
 */
function getErrorCode(err) {
    if (!err) return null;
    if (err.code) return err.code;
    const sym = Symbol.for('code');
    if (err[sym]) return err[sym];
    try {
        const syms = Object.getOwnPropertySymbols(err);
        for (const s of syms) {
            if (String(s).toLowerCase().includes('code')) return err[s];
        }
    } catch (e) { }
    return null;
}

module.exports = {
    sleep,
    normalizeString,
    normalizeChannelId,
    normalizeToken,
    getExponentialBackoffDelay,
    getErrorCode
};
