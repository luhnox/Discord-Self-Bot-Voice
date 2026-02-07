const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

let config = require('../config.json');

const LOG_DIR = './logs';
const LOG_FILE = path.join(LOG_DIR, `discord-bot-${new Date().toISOString().split('T')[0]}.log`);

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logMessage);
    
    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

function getLogRetentionDays() {
    const raw = process.env.LOG_RETENTION_DAYS;
    const days = raw ? Number(raw) : 7;
    if (!Number.isFinite(days) || days < 1) return 7;
    return Math.floor(days);
}

function cleanupOldLogs() {
    try {
        if (!fs.existsSync(LOG_DIR)) return;
        const retentionDays = getLogRetentionDays();
        const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

        const files = fs.readdirSync(LOG_DIR);
        for (const file of files) {
            const fullPath = path.join(LOG_DIR, file);
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) continue;
            if (stat.mtimeMs < cutoffMs) {
                fs.unlinkSync(fullPath);
                log('INFO', `Deleted old log file: ${file}`);
            }
        }
    } catch (err) {
        log('WARN', `Failed to cleanup logs: ${err.message}`);
    }
}

function loadConfig() {
    delete require.cache[require.resolve('../config.json')];
    config = require('../config.json');
    return config;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeString(value) {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str.length > 0 ? str : null;
}

function normalizeChannelId(value) {
    return normalizeString(value);
}

function normalizeToken(value) {
    return normalizeString(value);
}

function getExponentialBackoffDelay(attempt, baseDelayMs = 2000, maxDelayMs = 60000) {
    const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
    return Math.floor(delay + Math.random() * 1000);
}

function getErrorCode(err) {
    if (!err) return null;
    if (err.code) return err.code;
    const sym = Symbol.for('code');
    if (err[sym]) return err[sym];
    try {
        const syms = Object.getOwnPropertySymbols(err);
        for (const s of syms) {
            if (String(s).toLowerCase().includes('code')) return err[s];
        }
    } catch (e) { }
    return null;
}

function resolveConfigForLabel(label) {
    const cfg = config || {};
    let section = null;

    if (label === 'MAIN') section = cfg.main;
    if (label === 'SECOND') section = cfg.second;

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

function getTokens() {
    const tokens = [];
    const mainToken = normalizeToken(process.env.MAIN_TOKEN);
    const secondToken = normalizeToken(process.env.SECOND_TOKEN);
    const legacyToken = normalizeToken(process.env.TOKEN);

    if (mainToken) tokens.push({ token: mainToken, label: 'MAIN' });
    if (secondToken) tokens.push({ token: secondToken, label: 'SECOND' });

    if (tokens.length === 0 && legacyToken) {
        tokens.push({ token: legacyToken, label: 'LEGACY' });
    }

    return tokens;
}

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

async function joinChannelWithRetries(client, channel, settings, maxAttempts = 3, delayMs = 5000) {
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const conn = await client.voice.joinChannel(channel, settings);
            log('INFO', `Successfully joined channel: ${channel.name} (ID: ${channel.id})`);
            return conn;
        } catch (err) {
            lastErr = err;
            const code = getErrorCode(err);
            if (code === 'VOICE_CONNECTION_TIMEOUT') {
                const backoffDelay = getExponentialBackoffDelay(attempt);
                log('WARN', `Voice connection timeout (attempt ${attempt}/${maxAttempts}). Retrying in ${backoffDelay}ms...`);
                if (attempt < maxAttempts) await sleep(backoffDelay);
                continue;
            }
            log('ERROR', `joinChannelWithRetries error (non-timeout): ${err && (err.stack || err)}`);
            throw err;
        }
    }
    throw lastErr;
}

function start() {
    if (!validateConfig()) {
        log('ERROR', 'Configuration validation failed. Exiting...');
        process.exit(1);
    }

    cleanupOldLogs();
    setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

    const tokens = getTokens();

    process.on('unhandledRejection', err => {
        log('ERROR', `UnhandledRejection: ${err}`);
    });

    async function gracefulShutdown() {
        log('INFO', 'Graceful shutdown initiated...');
        try {
            // Semua client akan di-destroy via loop
            for (const c of clients) {
                if (c && c.destroy) {
                    await c.destroy();
                }
            }
            log('INFO', 'All Discord clients disconnected');
        } catch (err) {
            log('ERROR', `Error during graceful shutdown: ${err}`);
        }
        process.exit(0);
    }

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    const clients = [];

    async function startClient(token, label) {
        const envChannelId = normalizeChannelId(process.env.CHANNEL_ID);
        let resolved = resolveConfigForLabel(label);
        let CHANNEL_ID = resolved.channelId || envChannelId;
        let currentSettings = resolved.settings;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 5;

        const lastKnownChannelId = normalizeChannelId(loadLastChannelId(label));
        if (lastKnownChannelId && lastKnownChannelId !== CHANNEL_ID) {
            log('INFO', `[${label}] Bot remembers last channel: ${lastKnownChannelId}. Using that instead of env/config.`);
            CHANNEL_ID = lastKnownChannelId;
        }

        if (!CHANNEL_ID) {
            log('ERROR', `[${label}] CHANNEL_ID not found for this token. Skipping login.`);
            return;
        }

        const client = new Client();
        clients.push(client);

        client.on('ready', async () => {
            log('INFO', `[${label}] ${client.user.username} is ready!`);
            reconnectAttempts = 0;

            /** @type {import('discord.js-selfbot-v13').VoiceConnection | null} */
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

                if (channel.type !== 'GUILD_VOICE' && channel.type !== 2) {
                    log('ERROR', `[${label}] Channel is not a voice channel`);
                    return;
                }

                connection = await joinChannelWithRetries(client, channel, currentSettings);
                log('INFO', `[${label}] Joined voice channel — staying connected. Name: ${channel.name} | ID: ${channel.id}`);
                saveLastChannelId(CHANNEL_ID, label);

                fs.watchFile('./config.json', async () => {
                    try {
                        const oldSettings = { ...currentSettings };
                        const oldChannelId = CHANNEL_ID;
                        const newConfig = loadConfig();
                        resolved = resolveConfigForLabel(label);
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

                            connection = null;
                            await sleep(2000);

                            const newChannel = await client.channels.fetch(newChannelId).catch(() => null);
                            if (!newChannel) {
                                log('ERROR', `[${label}] New voice channel not found (invalid ID or not cached)`);
                                return;
                            }

                            if (newChannel.type !== 'GUILD_VOICE' && newChannel.type !== 2) {
                                log('ERROR', `[${label}] New channel is not a voice channel`);
                                return;
                            }

                            connection = await joinChannelWithRetries(client, newChannel, newSettings, 3, 7000);
                            log('INFO', `[${label}] Successfully switched to new voice channel. Name: ${newChannel.name} | ID: ${newChannel.id}`);
                            
                            CHANNEL_ID = newChannelId;
                            currentSettings = newSettings;
                            saveLastChannelId(CHANNEL_ID, label);
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
                                        currentSettings = newSettings;
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

                                connection = null;
                                await sleep(2000);

                                connection = await joinChannelWithRetries(client, ch, newSettings, 3, 7000);
                                log('INFO', `[${label}] Re-applied voice settings from config.json`);
                                currentSettings = newSettings;
                            }
                        }
                    } catch (e) {
                        log('ERROR', `[${label}] Failed to reload config.json / apply new settings: ${e}`);
                    }
                });
            } catch (e) {
                log('ERROR', `[${label}] Error joining voice channel: ${e}`);
            }
        });

        client.on('voiceStateUpdate', async (oldState, newState) => {
            try {
                const myId = client.user.id;

                const left =
                    oldState &&
                    oldState.id === myId &&
                    oldState.channelId === CHANNEL_ID;

                const nowIn =
                    newState &&
                    newState.id === myId &&
                    newState.channelId === CHANNEL_ID;

                if (left && !nowIn) {
                    reconnectAttempts++;
                    log('WARN', `[${label}] Detected instant leave from voice (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) — attempting to reconnect...`);

                    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
                        log('ERROR', `[${label}] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) exceeded. Stopping reconnect attempts. Please restart bot.`);
                        return;
                    }

                    const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
                    if (!ch) {
                        log('ERROR', `[${label}] Reconnect failed: channel not found`);
                        return;
                    }

                    const backoffDelay = getExponentialBackoffDelay(reconnectAttempts);
                    log('INFO', `[${label}] Waiting ${backoffDelay}ms before reconnect attempt...`);
                    await sleep(backoffDelay);

                    connection = await joinChannelWithRetries(client, ch, currentSettings, 3, 7000);
                    log('INFO', `[${label}] Reconnected to voice channel.`);
                }
            } catch (err) {
                log('ERROR', `[${label}] voiceStateUpdate handler failed: ${err}`);
            }
        });

        await client.login(token);
    }

    tokens.forEach(({ token, label }) => {
        startClient(token, label).catch(err => {
            log('ERROR', `[${label}] Failed to start client: ${err}`);
        });
    });
}

module.exports = { start };