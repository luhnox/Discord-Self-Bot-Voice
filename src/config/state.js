const fs = require('fs');
const { normalizeChannelId } = require('../utils/helpers');
const { log } = require('../utils/logger');

/**
 * Load last known channel ID for a token
 * @param {string} stateKey - State key (token label)
 * @returns {string|null} Channel ID or null
 */
function loadLastChannelId(stateKey = 'default') {
    const stateFile = './bot-state.json';
    if (fs.existsSync(stateFile)) {
        try {
            const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            if (state && state.lastChannelId && state.lastChannelId[stateKey]) {
                return state.lastChannelId[stateKey];
            }
            return state.lastChannelId || null;
        } catch (err) {
            log('WARN', `Failed to load bot state: ${err.message}`);
            return null;
        }
    }
    return null;
}

/**
 * Save last known channel ID for a token
 * @param {string} channelId - Channel ID to save
 * @param {string} stateKey - State key (token label)
 */
function saveLastChannelId(channelId, stateKey = 'default') {
    const stateFile = './bot-state.json';
    try {
        let state = { lastChannelId: {} };
        if (fs.existsSync(stateFile)) {
            try {
                state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
                if (!state.lastChannelId || typeof state.lastChannelId !== 'object') {
                    state.lastChannelId = {};
                }
            } catch (e) {
                state = { lastChannelId: {} };
            }
        }
        state.lastChannelId[stateKey] = channelId;
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    } catch (err) {
        log('WARN', `Failed to save bot state: ${err.message}`);
    }
}

module.exports = {
    loadLastChannelId,
    saveLastChannelId
};
