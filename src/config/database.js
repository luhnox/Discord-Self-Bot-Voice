const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');
const { normalizeChannelId, normalizeToken } = require('../utils/helpers');

const CONFIG_PATH = path.join(__dirname, '../../config.json');

/**
 * Load configuration from config.json
 * @returns {Array} Array of user configurations
 */
function loadDatabase() {
    try {
        delete require.cache[require.resolve(CONFIG_PATH)];
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        log('ERROR', `Failed to load config.json: ${err.message}`);
        return [];
    }
}

/**
 * Save configuration to config.json
 * @param {Array} data - Configuration data
 */
function saveDatabase(data) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
        log('INFO', 'Config.json saved successfully');
    } catch (err) {
        log('ERROR', `Failed to save config.json: ${err.message}`);
    }
}

/**
 * Find user configuration by user ID
 * @param {string} userId - Discord user ID
 * @returns {Object|null} User configuration or null
 */
function findUserConfig(userId) {
    const db = loadDatabase();
    return db.find(u => u.userid === userId) || null;
}

/**
 * Get all tokens with their user IDs
 * @returns {Array<{token: string, userid: string}>} Array of token objects
 */
function getAllTokens() {
    const db = loadDatabase();
    return db
        .filter(u => u.token && normalizeToken(u.token))
        .map(u => ({
            token: normalizeToken(u.token),
            userid: u.userid,
            config: u
        }));
}

/**
 * Update user status
 * @param {string} userId - Discord user ID
 * @param {string} status - Status (online/offline)
 */
function updateUserStatus(userId, status) {
    const db = loadDatabase();
    const userIdx = db.findIndex(u => u.userid === userId);
    
    if (userIdx !== -1) {
        db[userIdx].status = status;
        saveDatabase(db);
        return db[userIdx];
    }
    return null;
}

/**
 * Update user settings
 * @param {string} userId - Discord user ID
 * @param {Object} updates - Settings to update
 */
function updateUserSettings(userId, updates) {
    const db = loadDatabase();
    const userIdx = db.findIndex(u => u.userid === userId);
    
    if (userIdx !== -1) {
        db[userIdx].settings = {
            ...db[userIdx].settings,
            ...updates
        };
        saveDatabase(db);
        return db[userIdx];
    }
    return null;
}

/**
 * Toggle user setting (boolean)
 * @param {string} userId - Discord user ID
 * @param {string} setting - Setting name (selfMute, selfDeaf, selfVideo)
 */
function toggleUserSetting(userId, setting) {
    const db = loadDatabase();
    const userIdx = db.findIndex(u => u.userid === userId);
    
    if (userIdx !== -1 && typeof db[userIdx].settings[setting] === 'boolean') {
        db[userIdx].settings[setting] = !db[userIdx].settings[setting];
        saveDatabase(db);
        return db[userIdx];
    }
    return null;
}

/**
 * Validate database structure
 * @returns {boolean} True if valid
 */
function validateDatabase() {
    log('INFO', 'Validating database...');
    const db = loadDatabase();

    if (!Array.isArray(db) || db.length === 0) {
        log('ERROR', 'Config.json must be a non-empty array');
        return false;
    }

    let valid = true;

    for (const user of db) {
        if (!user.userid || !user.token) {
            log('WARN', 'Found user without userid or token, skipping');
            continue;
        }

        if (!user.settings || !user.status) {
            log('WARN', `User ${user.userid} has incomplete data, initializing...`);
            if (!user.settings) {
                user.settings = {
                    selfMute: false,
                    selfDeaf: false,
                    selfVideo: false,
                    channel_id: ''
                };
            }
            if (!user.status) {
                user.status = 'offline';
            }
        }

        if (!normalizeToken(user.token)) {
            log('WARN', `User ${user.userid} has invalid token format`);
            valid = false;
        }
    }

    if (!valid) {
        saveDatabase(db);
    }

    log('INFO', 'Database validation passed');
    return true;
}

module.exports = {
    loadDatabase,
    saveDatabase,
    findUserConfig,
    getAllTokens,
    updateUserStatus,
    updateUserSettings,
    toggleUserSetting,
    validateDatabase
};
