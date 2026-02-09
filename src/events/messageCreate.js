const { log } = require('../utils/logger');
const { handleCommand } = require('../handlers/commands');
const { saveLastChannelId } = require('../config/state');

// Track last channel change time per user (to prevent rapid changes)
const lastChannelChangeTime = new Map();
// Track last settings change time per user (to prevent rapid changes)
const lastSettingsChangeTime = new Map();

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

            // Check for channel change cooldown (minimum 8 seconds between changes)
            const isChannelChangeCommand = parts.length >= 4 && 
                                          parts[1].toLowerCase() === 'set' && 
                                          parts[2].toLowerCase() === 'channel';
            
            if (isChannelChangeCommand) {
                const now = Date.now();
                const lastChange = lastChannelChangeTime.get(currentUserId) || 0;
                const cooldownMs = 8000; // 8 seconds cooldown
                const timeSinceLastChange = now - lastChange;
                
                if (timeSinceLastChange < cooldownMs) {
                    const remainingMs = cooldownMs - timeSinceLastChange;
                    const availableAtTimestamp = Math.floor((now + remainingMs) / 1000);
                    
                    const replyMessage = await message.reply(`⏳ Please wait <t:${availableAtTimestamp}:R> before changing channel again.`).catch(() => null);
                    
                    // Auto-delete the message after cooldown expires
                    if (replyMessage) {
                        setTimeout(() => {
                            replyMessage.delete().catch(() => {});
                        }, remainingMs);
                    }
                    
                    return;
                }
                
                // Update last channel change time
                lastChannelChangeTime.set(currentUserId, now);
            }

            // Check for settings change cooldown (minimum 5 seconds between changes)
            const isSettingsChangeCommand = parts.length >= 4 && 
                                           parts[1].toLowerCase() === 'set' && 
                                           parts[2].toLowerCase() === 'settings' &&
                                           ['mute', 'deaf', 'video'].includes(parts[3]?.toLowerCase());
            
            if (isSettingsChangeCommand) {
                const now = Date.now();
                const lastChange = lastSettingsChangeTime.get(currentUserId) || 0;
                const cooldownMs = 5000; // 5 seconds cooldown
                const timeSinceLastChange = now - lastChange;
                
                if (timeSinceLastChange < cooldownMs) {
                    const remainingMs = cooldownMs - timeSinceLastChange;
                    const availableAtTimestamp = Math.floor((now + remainingMs) / 1000);
                    
                    const replyMessage = await message.reply(`⏳ Please wait <t:${availableAtTimestamp}:R> before changing settings again.`).catch(() => null);
                    
                    // Auto-delete the message after cooldown expires
                    if (replyMessage) {
                        setTimeout(() => {
                            replyMessage.delete().catch(() => {});
                        }, remainingMs);
                    }
                    
                    return;
                }
                
                // Update last settings change time
                lastSettingsChangeTime.set(currentUserId, now);
            }

            // Try to parse and handle command
            const result = await handleCommand(message.content, message, client);

            if (!result) {
                // Not a valid command, ignore
                return;
            }

            // Log command
            log('INFO', `[${currentUserId}] Command executed by ${message.author.username}: ${message.content}`);

            // Send reply
            if (result.message) {
                const replyMessage = await message.reply(result.message).catch(err => {
                    log('ERROR', `Failed to send reply: ${err.message}`);
                    return null;
                });
                
                // Auto-delete command reply after 10 seconds
                if (replyMessage) {
                    setTimeout(() => {
                        replyMessage.delete().catch(() => {});
                    }, 10000); // 10 seconds
                }
            }

            // Handle special actions
            if (result.action === 'disconnect' && onCommandAction) {
                onCommandAction({
                    type: 'disconnect',
                    userId: result.userConfig?.userid
                });
            } else if (result.action === 'channel_change' && onCommandAction) {
                // Save to bot-state.json when channel changes
                if (result.newChannelId) {
                    saveLastChannelId(result.newChannelId, currentUserId);
                    log('INFO', `[${currentUserId}] bot-state.json updated with new channel ID: ${result.newChannelId}`);
                }
                
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
