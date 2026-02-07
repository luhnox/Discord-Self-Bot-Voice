const fs = require('fs');
const { normalizeChannelId, normalizeToken } = require('../utils/helpers');
const { log } = require('../utils/logger');
const { TOKEN_LABELS } = require('../utils/constants');

let config = require('../../config.json');

/**
 * Reload configuration from file
 * @returns {Object} Reloaded configuration
 */
function loadConfig() {
    delete require.cache[require.resolve('../../config.json')];
    config = require('../../config.json');
    return config;
}

/**
 * Resolve configuration for a specific token label
 * @param {string} label - Token label (MAIN, SECOND, etc.)
 * @returns {Object} Resolved configuration with channelId and settings
 */
function resolveConfigForLabel(label) {
    const cfg = config || {};
    let section = null;

    if (label === TOKEN_LABELS.MAIN) section = cfg.main;
    if (label === TOKEN_LABELS.SECOND) section = cfg.second;

    if (!section) {
        section = cfg.settings || cfg.default || {};
    }

    const channelId = normalizeChannelId(section.CHANNEL_ID || section.channelId);

    return {
        section,
        channelId,
        settings: {
            selfMute: !!section.selfMute,
            selfDeaf: !!section.selfDeaf,
            selfVideo: !!section.selfVideo,
        },
    };
}

/**
 * Get all tokens from environment variables
 * @returns {Array<{token: string, label: string}>} Array of token objects
 */
function getTokens() {
    const tokens = [];
    const mainToken = normalizeToken(process.env.MAIN_TOKEN);
    const secondToken = normalizeToken(process.env.SECOND_TOKEN);
    const legacyToken = normalizeToken(process.env.TOKEN);

    if (mainToken) tokens.push({ token: mainToken, label: TOKEN_LABELS.MAIN });
    if (secondToken) tokens.push({ token: secondToken, label: TOKEN_LABELS.SECOND });

    if (tokens.length === 0 && legacyToken) {
        tokens.push({ token: legacyToken, label: TOKEN_LABELS.LEGACY });
    }

    return tokens;
}

/**
 * Validate configuration before starting
 * @returns {boolean} True if valid, false otherwise
 */
function validateConfig() {
    log('INFO', 'Validating configuration...');
    
    const tokens = getTokens();
    const envChannelId = normalizeChannelId(process.env.CHANNEL_ID);

    if (tokens.length === 0) {
        log('ERROR', 'No tokens found. Please set MAIN_TOKEN and/or SECOND_TOKEN in .env');
        return false;
    }

    let valid = true;

    for (const { label } of tokens) {
        const { section, channelId } = resolveConfigForLabel(label);
        const effectiveChannelId = channelId || envChannelId;

        if (!effectiveChannelId) {
            log('ERROR', `[${label}] CHANNEL_ID not found in config.json or .env`);
            valid = false;
        }

        if (section && typeof section.selfMute !== 'boolean') {
            log('WARN', `[${label}] selfMute is not a boolean, defaulting to false`);
            section.selfMute = false;
        }

        if (section && typeof section.selfDeaf !== 'boolean') {
            log('WARN', `[${label}] selfDeaf is not a boolean, defaulting to false`);
            section.selfDeaf = false;
        }

        if (section && typeof section.selfVideo !== 'boolean') {
            log('WARN', `[${label}] selfVideo is not a boolean, defaulting to false`);
            section.selfVideo = false;
        }
    }

    if (!valid) return false;

    log('INFO', 'Configuration validation passed');
    return true;
}

module.exports = {
    loadConfig,
    resolveConfigForLabel,
    getTokens,
    validateConfig
};
