const { log } = require('../utils/logger');
const { sleep } = require('../utils/helpers');
const { loadConfig, resolveConfigForLabel } = require('../config/config');
const { saveLastChannelId } = require('../config/state');
const { joinChannelWithRetries } = require('../core/voice');
const { VOICE_CHANNEL_TYPES, CHANNEL_SWITCH_DELAY_MS } = require('../utils/constants');

/**
 * Handle config file changes
 * @param {Object} params - Handler parameters
 */
async function handleConfigChange(params) {
    const { 
        label, 
        connection, 
        client, 
        CHANNEL_ID, 
        currentSettings,
        onConnectionUpdate,
        onChannelUpdate,
        onSettingsUpdate
    } = params;

    try {
        const oldSettings = { ...currentSettings };
        const oldChannelId = CHANNEL_ID;
        const newConfig = loadConfig();
        const resolved = resolveConfigForLabel(label);
        const newSettings = resolved.settings;
        const newChannelId = resolved.channelId || oldChannelId;

        const settingsChanged =
            oldSettings.selfMute !== newSettings.selfMute ||
            oldSettings.selfDeaf !== newSettings.selfDeaf ||
            oldSettings.selfVideo !== newSettings.selfVideo;

        const channelChanged = oldChannelId !== newChannelId;

        if (!settingsChanged && !channelChanged) return;

        log('INFO', `[${label}] config.json changed — oldSettings: ${JSON.stringify(oldSettings)}, newSettings: ${JSON.stringify(newSettings)}`);

        if (channelChanged) {
            log('INFO', `[${label}] CHANNEL_ID changed from ${oldChannelId} to ${newChannelId} — switching voice channels...`);
            
            try {
                if (connection && typeof connection.disconnect === 'function') {
                    await connection.disconnect().catch(() => { });
                }
                if (connection && typeof connection.destroy === 'function') {
                    connection.destroy();
                }
            } catch (e) { }

            await sleep(CHANNEL_SWITCH_DELAY_MS);

            const newChannel = await client.channels.fetch(newChannelId).catch(() => null);
            if (!newChannel) {
                log('ERROR', `[${label}] New voice channel not found (invalid ID or not cached)`);
                return;
            }

            if (!VOICE_CHANNEL_TYPES.includes(newChannel.type)) {
                log('ERROR', `[${label}] New channel is not a voice channel`);
                return;
            }

            const newConnection = await joinChannelWithRetries(client, newChannel, newSettings);
            log('INFO', `[${label}] Successfully switched to new voice channel. Name: ${newChannel.name} | ID: ${newChannel.id}`);
            
            saveLastChannelId(newChannelId, label);
            onConnectionUpdate(newConnection);
            onChannelUpdate(newChannelId);
            onSettingsUpdate(newSettings);
            return;
        }

        if (settingsChanged) {
            log('INFO', `[${label}] Voice settings changed (but channel ID same) — updating settings...`);

            if (connection && connection.channel && connection.channel.id === CHANNEL_ID) {
                const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
                if (!ch) {
                    log('ERROR', `[${label}] Channel not found while applying new config`);
                    return;
                }

                log('INFO', `[${label}] Attempting lightweight update via connection.sendVoiceStateUpdate`);

                try {
                    if (connection && typeof connection.sendVoiceStateUpdate === 'function') {
                        await connection.sendVoiceStateUpdate({
                            channel_id: CHANNEL_ID,
                            self_mute: !!newSettings.selfMute,
                            self_deaf: !!newSettings.selfDeaf,
                            self_video: !!newSettings.selfVideo,
                        });
                        log('INFO', `[${label}] Applied voice state via sendVoiceStateUpdate.`);
                        onSettingsUpdate(newSettings);
                        return;
                    }
                } catch (err) {
                    log('WARN', `[${label}] sendVoiceStateUpdate failed, falling back to reconnect: ${err && err.message}`);
                }

                try {
                    if (typeof connection.disconnect === 'function') {
                        await connection.disconnect().catch(() => { });
                    }
                    if (typeof connection.destroy === 'function') {
                        connection.destroy();
                    }
                } catch (e) { }

                await sleep(CHANNEL_SWITCH_DELAY_MS);

                const newConnection = await joinChannelWithRetries(client, ch, newSettings);
                log('INFO', `[${label}] Re-applied voice settings from config.json`);
                onConnectionUpdate(newConnection);
                onSettingsUpdate(newSettings);
            }
        }
    } catch (e) {
        log('ERROR', `[${label}] Failed to reload config.json / apply new settings: ${e}`);
    }
}

module.exports = {
    handleConfigChange
};
