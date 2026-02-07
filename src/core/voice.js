const { log } = require('../utils/logger');
const { 
    sleep, 
    getExponentialBackoffDelay, 
    getErrorCode 
} = require('../utils/helpers');
const { JOIN_RETRY_ATTEMPTS } = require('../utils/constants');

/**
 * Join a voice channel with retry logic
 * @param {Object} client - Discord client
 * @param {Object} channel - Voice channel object
 * @param {Object} settings - Voice settings
 * @param {number} maxAttempts - Maximum retry attempts
 * @returns {Promise<Object>} Voice connection
 */
async function joinChannelWithRetries(client, channel, settings, maxAttempts = JOIN_RETRY_ATTEMPTS) {
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const conn = await client.voice.joinChannel(channel, settings);
            log('INFO', `Successfully joined channel: ${channel.name} (ID: ${channel.id})`);
            return conn;
        } catch (err) {
            lastErr = err;
            const code = getErrorCode(err);
            if (code === 'VOICE_CONNECTION_TIMEOUT') {
                const backoffDelay = getExponentialBackoffDelay(attempt);
                log('WARN', `Voice connection timeout (attempt ${attempt}/${maxAttempts}). Retrying in ${backoffDelay}ms...`);
                if (attempt < maxAttempts) await sleep(backoffDelay);
                continue;
            }
            log('ERROR', `joinChannelWithRetries error (non-timeout): ${err && (err.stack || err)}`);
            throw err;
        }
    }
    throw lastErr;
}

module.exports = {
    joinChannelWithRetries
};
