const fs = require('fs');
const { Client } = require('discord.js-selfbot-v13');
const { log } = require('../utils/logger');
const { normalizeChannelId } = require('../utils/helpers');
const { saveLastChannelId, loadLastChannelId } = require('../config/state');
const { joinChannelWithRetries } = require('./voice');
const { setupReadyHandler } = require('../events/ready');
const { setupVoiceStateUpdateHandler } = require('../events/voiceStateUpdate');
const { setupMessageHandler } = require('../events/messageCreate');

/**
 * Start a Discord client for a specific token
 * @param {string} token - Discord token
 * @param {string} userid - User ID
 * @param {Object} config - User configuration
 * @returns {Promise<Client>} Discord client
 */
async function startClient(token, userid, config) {
    let CHANNEL_ID = normalizeChannelId(config.settings.channel_id);
    let currentSettings = config.settings;
    let reconnectAttempts = 0;
    let connection = null;

    const lastKnownChannelId = normalizeChannelId(loadLastChannelId(userid));
    if (lastKnownChannelId && lastKnownChannelId !== CHANNEL_ID) {
        log('INFO', `[${userid}] Bot remembers last channel: ${lastKnownChannelId}. Using that instead of config.`);
        CHANNEL_ID = lastKnownChannelId;
    }

    if (!CHANNEL_ID) {
        log('ERROR', `[${userid}] CHANNEL_ID not found in config. Skipping login.`);
        return null;
    }

    const client = new Client();

    // Setup event handlers
    setupReadyHandler(client, {
        label: userid,
        CHANNEL_ID,
        currentSettings,
        onConnectionUpdate: (newConn) => { connection = newConn; },
        onChannelUpdate: (newId) => { CHANNEL_ID = newId; },
        onSettingsUpdate: (newSettings) => { currentSettings = newSettings; }
    });

    setupVoiceStateUpdateHandler(client, {
        label: userid,
        getChannelId: () => CHANNEL_ID,
        getCurrentSettings: () => currentSettings,
        getReconnectAttempts: () => reconnectAttempts,
        onReconnectAttemptUpdate: (attempts) => { reconnectAttempts = attempts; },
        onConnectionUpdate: (newConn) => { connection = newConn; }
    });

    // Setup message handler for commands
    setupMessageHandler(client, {
        label: userid,
        onCommandAction: async (action) => {
            if (action.type === 'disconnect') {
                log('INFO', `[${userid}] Disconnecting from voice due to command`);
                if (connection) {
                    connection.disconnect();
                    connection = null;
                }
            } else if (action.type === 'channel_change') {
                log('INFO', `[${userid}] Channel changed to ${action.channelId}`);
                CHANNEL_ID = action.channelId;
            } else if (action.type === 'reload') {
                log('INFO', `[${userid}] Reloading voice connection...`);
                
                // Disconnect current connection
                if (connection) {
                    try {
                        await connection.disconnect().catch(() => {});
                        connection = null;
                    } catch (err) {
                        log('WARN', `[${userid}] Error disconnecting during reload: ${err.message}`);
                    }
                }
                
                // Wait a moment before reconnecting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Rejoin with current settings
                try {
                    const channel = await client.channels.fetch(action.channelId).catch(() => null);
                    if (channel) {
                        const newConnection = await joinChannelWithRetries(client, channel, action.settings);
                        connection = newConnection;
                        reconnectAttempts = 0; // Reset reconnect attempts
                        log('INFO', `[${userid}] Voice connection reloaded successfully`);
                    } else {
                        log('ERROR', `[${userid}] Channel not found during reload`);
                    }
                } catch (err) {
                    log('ERROR', `[${userid}] Failed to reload voice connection: ${err.message}`);
                }
            }
        },
        onSettingsUpdate: (update) => {
            // Reload settings from updated user config
            if (update.settings) {
                currentSettings = update.settings;
                log('INFO', `[${userid}] Settings updated and reloaded in memory`);
            }
        }
    });

    await client.login(token);
    return client;
}

module.exports = {
    startClient
};
