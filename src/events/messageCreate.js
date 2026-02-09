const { log } = require('../utils/logger');
const { handleCommand } = require('../handlers/commands');

/**
 * Setup message event handler
 * @param {Object} client - Discord client
 * @param {Object} context - Context with label (userid) and callbacks
 */
function setupMessageHandler(client, context) {
    const { label: currentUserId, onCommandAction, onSettingsUpdate } = context;

    client.on('messageCreate', async (message) => {
        try {
            // Ignore bot messages and empty content
            if (message.author.bot || !message.content) return;

            // Parse command to get target userid
            const parts = message.content.trim().split(/\s+/);
            if (parts.length < 2) return;
            
            const targetUserId = parts[0].replace(/[<@!>]/g, '');
            
            // Only respond if this message is for this user
            if (targetUserId !== currentUserId) {
                return;
            }

            // Try to parse and handle command
            const result = handleCommand(message.content, message);

            if (!result) {
                // Not a valid command, ignore
                return;
            }

            // Log command
            log('INFO', `[${currentUserId}] Command executed by ${message.author.username}: ${message.content}`);

            // Send reply
            if (result.message) {
                await message.reply(result.message).catch(err => {
                    log('ERROR', `Failed to send reply: ${err.message}`);
                });
            }

            // Handle special actions
            if (result.action === 'disconnect' && onCommandAction) {
                onCommandAction({
                    type: 'disconnect',
                    userId: result.userConfig?.userid
                });
            } else if (result.action === 'channel_change' && onCommandAction) {
                onCommandAction({
                    type: 'channel_change',
                    userId: result.userConfig?.userid,
                    channelId: result.userConfig?.settings.channel_id
                });
            }

            // Update settings if changed (for mute, deaf, video toggles, status changes)
            if (result.userConfig && onSettingsUpdate) {
                onSettingsUpdate({
                    settings: result.userConfig.settings,
                    status: result.userConfig.status
                });
            }

        } catch (err) {
            log('ERROR', `Error handling message: ${err.message}`);
        }
    });
}

module.exports = {
    setupMessageHandler
};
