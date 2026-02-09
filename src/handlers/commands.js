const { log } = require('../utils/logger');
const { normalizeChannelId } = require('../utils/helpers');
const {
    findUserConfig,
    updateUserStatus,
    updateUserSettings,
    toggleUserSetting
} = require('../config/database');

const COMMANDS = {
    SET: 'set',
    SETTING: 'setting',
    SETTINGS: 'settings',
    HELP: 'help'
};

/**
 * Parse command from message
 * @param {string} content - Message content
 * @returns {Object|null} Parsed command object
 */
function parseCommand(content) {
    const parts = content.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const userId = parts[0].replace(/[<@!>]/g, '');
    const command = parts[1]?.toLowerCase();

    return {
        userId,
        command,
        args: parts.slice(2),
        raw: parts
    };
}

/**
 * Generate help message
 * @returns {string} Help message
 */
function getHelpMessage() {
    return `**Available Commands:**
\`\`\`
<@userid> set offline                    - Set user offline and disconnect from voice
<@userid> set online                     - Set user online
<@userid> settings list                  - Show user settings
<@userid> set settings mute              - Toggle self mute
<@userid> set settings deaf              - Toggle self deaf
<@userid> set settings video             - Toggle self video
<@userid> set channel <channel_id>       - Set voice channel
<@userid> help                           - Show this help message
\`\`\`

**Examples:**
\`1032472108414017576 set offline\`
\`<@1032472108414017576> settings list\`
\`1032472108414017576 set settings mute\`
\`1032472108414017576 set channel 1449039761489788939\``;
}

/**
 * Generate settings list message
 * @param {Object} userConfig - User configuration
 * @returns {string} Formatted settings message
 */
function getSettingsListMessage(userConfig) {
    if (!userConfig) {
        return '❌ User not found in configuration';
    }

    return `**Settings for ${userConfig.userid}:**
\`\`\`
Status: ${userConfig.status}
Settings: {
    Self Mute: ${userConfig.settings.selfMute},
    Self Deaf: ${userConfig.settings.selfDeaf},
    Self Video: ${userConfig.settings.selfVideo},
    Channel: ${userConfig.settings.channel_id || 'Not set'}
}
\`\`\``;
}

/**
 * Handle set offline command
 * @param {string} userId - User ID
 * @returns {Object} Result with message and userConfig
 */
function handleSetOffline(userId) {
    const userConfig = updateUserStatus(userId, 'offline');
    if (!userConfig) {
        return {
            success: false,
            message: `❌ User ${userId} not found in configuration`
        };
    }

    return {
        success: true,
        message: `✅ ${userId} is now **offline** and should disconnect from voice channel`,
        userConfig,
        action: 'disconnect'
    };
}

/**
 * Handle set online command
 * @param {string} userId - User ID
 * @returns {Object} Result with message and userConfig
 */
function handleSetOnline(userId) {
    const userConfig = updateUserStatus(userId, 'online');
    if (!userConfig) {
        return {
            success: false,
            message: `❌ User ${userId} not found in configuration`
        };
    }

    return {
        success: true,
        message: `✅ ${userId} is now **online**`,
        userConfig
    };
}

/**
 * Handle settings toggle commands
 * @param {string} userId - User ID
 * @param {string} setting - Setting name
 * @returns {Object} Result with message and userConfig
 */
function handleToggleSetting(userId, setting) {
    const validSettings = ['mute', 'deaf', 'video'];
    if (!validSettings.includes(setting)) {
        return {
            success: false,
            message: `❌ Invalid setting. Use: ${validSettings.join(', ')}`
        };
    }

    const settingMap = {
        'mute': 'selfMute',
        'deaf': 'selfDeaf',
        'video': 'selfVideo'
    };

    const userConfig = toggleUserSetting(userId, settingMap[setting]);
    if (!userConfig) {
        return {
            success: false,
            message: `❌ User ${userId} not found in configuration`
        };
    }

    const newValue = userConfig.settings[settingMap[setting]];
    return {
        success: true,
        message: `✅ ${userId}'s **${setting}** is now **${newValue ? 'enabled' : 'disabled'}**`,
        userConfig
    };
}

/**
 * Handle set channel command
 * @param {string} userId - User ID
 * @param {string} channelId - Channel ID
 * @returns {Object} Result with message and userConfig
 */
function handleSetChannel(userId, channelId) {
    const normalized = normalizeChannelId(channelId);
    if (!normalized) {
        return {
            success: false,
            message: `❌ Invalid channel ID: ${channelId}`
        };
    }

    const userConfig = updateUserSettings(userId, { channel_id: normalized });
    if (!userConfig) {
        return {
            success: false,
            message: `❌ User ${userId} not found in configuration`
        };
    }

    return {
        success: true,
        message: `✅ ${userId}'s channel has been set to **${normalized}**`,
        userConfig,
        action: 'channel_change'
    };
}

/**
 * Main command handler
 * @param {string} content - Message content
 * @param {Object} message - Discord message object
 * @returns {Object|null} Command result or null
 */
function handleCommand(content, message) {
    const parsed = parseCommand(content);
    if (!parsed) return null;

    const { userId, command, args } = parsed;

    // Only log debug if user exists in database
    const userConfig = findUserConfig(userId);
    if (!userConfig) {
        // User not in database, silently skip
        return null;
    }

    // Log debug only for valid users
    log('DEBUG', `Command: userId=${userId}, cmd=${command}, args=${args.join(' ')}`);

    // Help command
    if (command === COMMANDS.HELP) {
        return {
            success: true,
            message: getHelpMessage()
        };
    }

    // Settings list command
    if (command === COMMANDS.SETTINGS && args[0] === 'list') {
        const userConfig = findUserConfig(userId);
        return {
            success: true,
            message: getSettingsListMessage(userConfig),
            userConfig
        };
    }

    // Settings list command (alternative)
    if (command === COMMANDS.SETTING && args[0] === 'list') {
        const userConfig = findUserConfig(userId);
        return {
            success: true,
            message: getSettingsListMessage(userConfig),
            userConfig
        };
    }

    // Set commands
    if (command === COMMANDS.SET) {
        if (args.length === 0) {
            return {
                success: false,
                message: `❌ Usage: <@${userId}> set <offline|online|settings|channel> [args]`
            };
        }

        const subcommand = args[0].toLowerCase();

        // Set offline
        if (subcommand === 'offline') {
            return handleSetOffline(userId);
        }

        // Set online
        if (subcommand === 'online') {
            return handleSetOnline(userId);
        }

        // Set settings (toggle)
        if (subcommand === 'settings') {
            if (args.length < 2) {
                return {
                    success: false,
                    message: `❌ Usage: <@${userId}> set settings <mute|deaf|video>`
                };
            }
            return handleToggleSetting(userId, args[1].toLowerCase());
        }

        // Set channel
        if (subcommand === 'channel') {
            if (args.length < 2) {
                return {
                    success: false,
                    message: `❌ Usage: <@${userId}> set channel <channel_id>`
                };
            }
            return handleSetChannel(userId, args[1]);
        }

        return {
            success: false,
            message: `❌ Unknown subcommand: ${subcommand}`
        };
    }

    return null;
}

module.exports = {
    parseCommand,
    handleCommand,
    getHelpMessage,
    getSettingsListMessage,
    COMMANDS
};
