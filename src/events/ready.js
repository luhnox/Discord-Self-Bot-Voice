const fs = require('fs');
const { log } = require('../utils/logger');
const { normalizeChannelId } = require('../utils/helpers');
const { saveLastChannelId } = require('../config/state');
const { joinChannelWithRetries } = require('../core/voice');
const { VOICE_CHANNEL_TYPES } = require('../utils/constants');
const { handleConfigChange } = require('../handlers/configChange');

/**
 * Setup ready event handler for Discord client
 * @param {Object} client - Discord client
 * @param {Object} context - Context object with CHANNEL_ID, settings, callbacks
 */
function setupReadyHandler(client, context) {
    const { label, CHANNEL_ID, currentSettings, onConnectionUpdate, onChannelUpdate, onSettingsUpdate } = context;

    client.on('ready', async () => {
        log('INFO', `[${label}] ${client.user.username} is ready!`);

        let connection = null;

        try {
            let channel = client.channels.cache.get(CHANNEL_ID);
            if (!channel) {
                channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
            }

            if (!channel) {
                log('ERROR', `[${label}] Voice channel not found (invalid ID or not cached)`);
                return;
            }

            if (!VOICE_CHANNEL_TYPES.includes(channel.type)) {
                log('ERROR', `[${label}] Channel is not a voice channel`);
                return;
            }

            connection = await joinChannelWithRetries(client, channel, currentSettings);
            log('INFO', `[${label}] Joined voice channel — staying connected. Name: ${channel.name} | ID: ${channel.id}`);
            saveLastChannelId(CHANNEL_ID, label);
            onConnectionUpdate(connection);

            // Watch config file for changes
            fs.watchFile('./config.json', async () => {
                await handleConfigChange({
                    label,
                    connection,
                    client,
                    CHANNEL_ID,
                    currentSettings,
                    onConnectionUpdate,
                    onChannelUpdate,
                    onSettingsUpdate
                });
            });
        } catch (e) {
            log('ERROR', `[${label}] Error joining voice channel: ${e}`);
        }
    });
}

module.exports = {
    setupReadyHandler
};
