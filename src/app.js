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

function loadConfig() {
    delete require.cache[require.resolve('../config.json')];
    config = require('../config.json');
    return config;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

function validateConfig() {
    log('INFO', 'Validating configuration...');
    
    if (!config.settings) {
        log('ERROR', 'config.json missing "settings" object');
        return false;
    }

    const CHANNEL_ID = process.env.CHANNEL_ID || config.settings.CHANNEL_ID;
    const TOKEN = process.env.TOKEN;

    if (!CHANNEL_ID) {
        log('ERROR', 'CHANNEL_ID not found in .env or config.json');
        return false;
    }

    if (!TOKEN) {
        log('ERROR', 'TOKEN not found in .env');
        return false;
    }

    if (typeof config.settings.selfMute !== 'boolean') {
        log('WARN', 'config.settings.selfMute is not a boolean, defaulting to false');
        config.settings.selfMute = false;
    }

    if (typeof config.settings.selfDeaf !== 'boolean') {
        log('WARN', 'config.settings.selfDeaf is not a boolean, defaulting to false');
        config.settings.selfDeaf = false;
    }

    if (typeof config.settings.selfVideo !== 'boolean') {
        log('WARN', 'config.settings.selfVideo is not a boolean, defaulting to false');
        config.settings.selfVideo = false;
    }

    log('INFO', 'Configuration validation passed');
    return true;
}

function loadLastChannelId() {
    const stateFile = './bot-state.json';
    if (fs.existsSync(stateFile)) {
        try {
            const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            return state.lastChannelId || null;
        } catch (err) {
            log('WARN', `Failed to load bot state: ${err.message}`);
            return null;
        }
    }
    return null;
}

function saveLastChannelId(channelId) {
    const stateFile = './bot-state.json';
    try {
        fs.writeFileSync(stateFile, JSON.stringify({ lastChannelId: channelId }, null, 2));
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

    let CHANNEL_ID = process.env.CHANNEL_ID || config.settings.CHANNEL_ID;
    const TOKEN = process.env.TOKEN;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    
    const lastKnownChannelId = loadLastChannelId();
    if (lastKnownChannelId && lastKnownChannelId !== CHANNEL_ID) {
        log('INFO', `Bot remembers last channel: ${lastKnownChannelId}. Using that instead of env/config.`);
        CHANNEL_ID = lastKnownChannelId;
    }

    const client = new Client();

    process.on('unhandledRejection', err => {
        log('ERROR', `UnhandledRejection: ${err}`);
    });

    async function gracefulShutdown() {
        log('INFO', 'Graceful shutdown initiated...');
        try {
            if (client && client.destroy) {
                await client.destroy();
                log('INFO', 'Discord client disconnected');
            }
        } catch (err) {
            log('ERROR', `Error during graceful shutdown: ${err}`);
        }
        process.exit(0);
    }

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    client.on('ready', async () => {
        log('INFO', `${client.user.username} is ready!`);
        reconnectAttempts = 0;

        /** @type {import('discord.js-selfbot-v13').VoiceConnection | null} */
        let connection = null;

        try {
            let channel = client.channels.cache.get(CHANNEL_ID);
            if (!channel) {
                channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
            }

            if (!channel) {
                log('ERROR', 'Voice channel not found (invalid ID or not cached)');
                return;
            }

            if (channel.type !== 'GUILD_VOICE' && channel.type !== 2) {
                log('ERROR', 'Channel is not a voice channel');
                return;
            }

            connection = await joinChannelWithRetries(client, channel, config.settings);
            log('INFO', `Joined voice channel — staying connected. Name: ${channel.name} | ID: ${channel.id}`);
            saveLastChannelId(CHANNEL_ID);

            fs.watchFile('./config.json', async () => {
                try {
                    const oldSettings = { ...config.settings };
                    const oldChannelId = CHANNEL_ID;
                    const newConfig = loadConfig();
                    const newSettings = newConfig.settings;
                    const newChannelId = newConfig.settings.CHANNEL_ID || oldChannelId;

                    const settingsChanged =
                        oldSettings.selfMute !== newSettings.selfMute ||
                        oldSettings.selfDeaf !== newSettings.selfDeaf ||
                        oldSettings.selfVideo !== newSettings.selfVideo;

                    const channelChanged = oldChannelId !== newChannelId;

                    if (!settingsChanged && !channelChanged) return;

                    log('INFO', `config.json changed — oldSettings: ${JSON.stringify(oldSettings)}, newSettings: ${JSON.stringify(newSettings)}`);

                    if (channelChanged) {
                        log('INFO', `CHANNEL_ID changed from ${oldChannelId} to ${newChannelId} — switching voice channels...`);
                        
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
                            log('ERROR', 'New voice channel not found (invalid ID or not cached)');
                            return;
                        }

                        if (newChannel.type !== 'GUILD_VOICE' && newChannel.type !== 2) {
                            log('ERROR', 'New channel is not a voice channel');
                            return;
                        }

                        connection = await joinChannelWithRetries(client, newChannel, newSettings, 3, 7000);
                        log('INFO', `Successfully switched to new voice channel. Name: ${newChannel.name} | ID: ${newChannel.id}`);
                        
                        CHANNEL_ID = newChannelId;
                        saveLastChannelId(CHANNEL_ID);
                        return;
                    }

                    if (settingsChanged) {
                        log('INFO', 'Voice settings changed (but channel ID same) — updating settings...');

                        if (connection && connection.channel && connection.channel.id === CHANNEL_ID) {
                            const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
                            if (!ch) {
                                log('ERROR', 'Channel not found while applying new config');
                                return;
                            }

                            log('INFO', 'Attempting lightweight update via connection.sendVoiceStateUpdate');

                            try {
                                if (connection && typeof connection.sendVoiceStateUpdate === 'function') {
                                    await connection.sendVoiceStateUpdate({
                                        channel_id: CHANNEL_ID,
                                        self_mute: !!newSettings.selfMute,
                                        self_deaf: !!newSettings.selfDeaf,
                                        self_video: !!newSettings.selfVideo,
                                    });
                                    log('INFO', 'Applied voice state via sendVoiceStateUpdate.');
                                    return;
                                }
                            } catch (err) {
                                log('WARN', `sendVoiceStateUpdate failed, falling back to reconnect: ${err && err.message}`);
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
                            log('INFO', 'Re-applied voice settings from config.json');
                        }
                    }
                } catch (e) {
                    log('ERROR', `Failed to reload config.json / apply new settings: ${e}`);
                }
            });
        } catch (e) {
            log('ERROR', `Error joining voice channel: ${e}`);
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
                log('WARN', `Detected instant leave from voice (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) — attempting to reconnect...`);

                if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
                    log('ERROR', `Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) exceeded. Stopping reconnect attempts. Please restart bot.`);
                    return;
                }

                const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
                if (!ch) {
                    log('ERROR', 'Reconnect failed: channel not found');
                    return;
                }

                const backoffDelay = getExponentialBackoffDelay(reconnectAttempts);
                log('INFO', `Waiting ${backoffDelay}ms before reconnect attempt...`);
                await sleep(backoffDelay);

                connection = await joinChannelWithRetries(client, ch, config.settings, 3, 7000);
                log('INFO', 'Reconnected to voice channel.');
            }
        } catch (err) {
            log('ERROR', `voiceStateUpdate handler failed: ${err}`);
        }
    });

    client.login(TOKEN);
}

module.exports = { start };