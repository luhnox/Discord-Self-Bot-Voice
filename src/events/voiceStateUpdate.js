const { log } = require('../utils/logger');
const { sleep, getExponentialBackoffDelay } = require('../utils/helpers');
const { joinChannelWithRetries } = require('../core/voice');
const { MAX_RECONNECT_ATTEMPTS } = require('../utils/constants');
const { findUserConfig } = require('../config/database');

/**
 * Setup voice state update event handler for Discord client
 * @param {Object} client - Discord client
 * @param {Object} context - Context object with callbacks and state getters
 */
function setupVoiceStateUpdateHandler(client, context) {
    const {
        label,
        getChannelId,
        getCurrentSettings,
        getReconnectAttempts,
        onReconnectAttemptUpdate,
        onConnectionUpdate
    } = context;

    client.on('voiceStateUpdate', async (oldState, newState) => {
        try {
            const myId = client.user.id;
            const CHANNEL_ID = getChannelId();
            const currentSettings = getCurrentSettings();
            const reconnectAttempts = getReconnectAttempts();

            const left =
                oldState &&
                oldState.id === myId &&
                oldState.channelId === CHANNEL_ID;

            const nowIn =
                newState &&
                newState.id === myId &&
                newState.channelId === CHANNEL_ID;

            if (left && !nowIn) {
                // Check if user is offline - if so, don't reconnect
                const userConfig = findUserConfig(label);
                if (userConfig && userConfig.status === 'offline') {
                    log('INFO', `[${label}] User status is offline. Skipping voice reconnect.`);
                    onReconnectAttemptUpdate(0); // Reset counter
                    return;
                }

                const newAttempts = reconnectAttempts + 1;
                onReconnectAttemptUpdate(newAttempts);
                
                log('WARN', `[${label}] Detected instant leave from voice (attempt ${newAttempts}/${MAX_RECONNECT_ATTEMPTS}) — attempting to reconnect...`);

                if (newAttempts > MAX_RECONNECT_ATTEMPTS) {
                    log('ERROR', `[${label}] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) exceeded. Stopping reconnect attempts. Please restart bot.`);
                    return;
                }

                const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
                if (!ch) {
                    log('ERROR', `[${label}] Reconnect failed: channel not found`);
                    return;
                }

                const backoffDelay = getExponentialBackoffDelay(newAttempts);
                log('INFO', `[${label}] Waiting ${backoffDelay}ms before reconnect attempt...`);
                await sleep(backoffDelay);

                const newConnection = await joinChannelWithRetries(client, ch, currentSettings);
                log('INFO', `[${label}] Reconnected to voice channel.`);
                onConnectionUpdate(newConnection);
            }
        } catch (err) {
            log('ERROR', `[${label}] voiceStateUpdate handler failed: ${err}`);
        }
    });
}

module.exports = {
    setupVoiceStateUpdateHandler
};
