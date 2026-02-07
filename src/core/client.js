const fs = require('fs');
const { Client } = require('discord.js-selfbot-v13');
const { log } = require('../utils/logger');
const { normalizeChannelId } = require('../utils/helpers');
const { resolveConfigForLabel } = require('../config/config');
const { saveLastChannelId, loadLastChannelId } = require('../config/state');
const { joinChannelWithRetries } = require('./voice');
const { setupReadyHandler } = require('../events/ready');
const { setupVoiceStateUpdateHandler } = require('../events/voiceStateUpdate');

/**
 * Start a Discord client for a specific token
 * @param {string} token - Discord token
 * @param {string} label - Token label
 * @returns {Promise<Client>} Discord client
 */
async function startClient(token, label) {
    const envChannelId = normalizeChannelId(process.env.CHANNEL_ID);
    let resolved = resolveConfigForLabel(label);
    let CHANNEL_ID = resolved.channelId || envChannelId;
    let currentSettings = resolved.settings;
    let reconnectAttempts = 0;
    let connection = null;

    const lastKnownChannelId = normalizeChannelId(loadLastChannelId(label));
    if (lastKnownChannelId && lastKnownChannelId !== CHANNEL_ID) {
        log('INFO', `[${label}] Bot remembers last channel: ${lastKnownChannelId}. Using that instead of env/config.`);
        CHANNEL_ID = lastKnownChannelId;
    }

    if (!CHANNEL_ID) {
        log('ERROR', `[${label}] CHANNEL_ID not found for this token. Skipping login.`);
        return null;
    }

    const client = new Client();

    // Setup event handlers
    setupReadyHandler(client, {
        label,
        CHANNEL_ID,
        currentSettings,
        onConnectionUpdate: (newConn) => { connection = newConn; },
        onChannelUpdate: (newId) => { CHANNEL_ID = newId; },
        onSettingsUpdate: (newSettings) => { currentSettings = newSettings; }
    });

    setupVoiceStateUpdateHandler(client, {
        label,
        getChannelId: () => CHANNEL_ID,
        getCurrentSettings: () => currentSettings,
        getReconnectAttempts: () => reconnectAttempts,
        onReconnectAttemptUpdate: (attempts) => { reconnectAttempts = attempts; },
        onConnectionUpdate: (newConn) => { connection = newConn; }
    });

    await client.login(token);
    return client;
}

module.exports = {
    startClient
};
