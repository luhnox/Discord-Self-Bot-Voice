const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
let config = require('./config.json');
const _consoleLog = console.log;
const _consoleInfo = console.info;
console.log = () => { };
console.info = () => { };
require('dotenv').config();
console.log = _consoleLog;
console.info = _consoleInfo;

function loadConfig() {
  delete require.cache[require.resolve('./config.json')];
  config = require('./config.json');
  return config;
}
process.env.DEBUG = process.env.DEBUG || 'werift*';

const client = new Client();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function joinChannelWithRetries(channel, settings, maxAttempts = 3, delayMs = 5000) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const conn = await client.voice.joinChannel(channel, settings);
      return conn;
    } catch (err) {
      lastErr = err;
      const code = err && (err.code || (err[Symbol.for('code')] && err[Symbol.for('code')]));
      if (code === 'VOICE_CONNECTION_TIMEOUT') {
        console.warn(
          `Voice connection timeout (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`,
        );
        if (attempt < maxAttempts) await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.TOKEN;

process.on('unhandledRejection', err => {
  console.error('UnhandledRejection:', err);
});

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);

  /** @type {import('discord.js-selfbot-v13').VoiceConnection | null} */
  let connection = null;

  try {
    let channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
      channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    }

    if (!channel) {
      console.error('Voice channel not found (invalid ID or not cached)');
      return;
    }

    if (channel.type !== 'GUILD_VOICE' && channel.type !== 2) {
      console.error('Channel is not a voice channel');
      return;
    }

    connection = await joinChannelWithRetries(channel, config.settings, 3, 7000);
    console.log(`Joined voice channel — staying connected. Name: ${channel.name} | ID: ${channel.id}`);

    fs.watchFile('./config.json', async () => {
      try {
        const oldSettings = { ...config.settings };
        const newConfig = loadConfig();
        const newSettings = newConfig.settings;

        const changed =
          oldSettings.selfMute !== newSettings.selfMute ||
          oldSettings.selfDeaf !== newSettings.selfDeaf ||
          oldSettings.selfVideo !== newSettings.selfVideo;

        if (!changed) return;

        console.log('config.json changed, applying new voice settings:', newSettings);

        if (connection && connection.channel && connection.channel.id === CHANNEL_ID) {
          const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
          if (!ch) {
            console.error('Channel not found while applying new config');
            return;
          }

          try {
            if (typeof connection.disconnect === 'function') {
              await connection.disconnect().catch(() => { });
            }
            if (typeof connection.destroy === 'function') {
              connection.destroy();
            }
          } catch (e) { }
          await sleep(1000);

          connection = await joinChannelWithRetries(ch, newSettings, 3, 7000);
          console.log('Re-applied voice settings from config.json');
        }
      } catch (e) {
        console.error('Failed to reload config.json / apply new settings:', e);
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
          console.warn('Detected instant leave from voice — attempting to reconnect...');

          const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
          if (!ch) {
            console.error('Reconnect failed: channel not found');
            return;
          }

          connection = await joinChannelWithRetries(ch, config.settings, 3, 7000);
          console.log('Reconnected to voice channel.');
        }
      } catch (err) {
        console.error('voiceStateUpdate handler failed:', err);
      }
    });
  } catch (err) {
    console.error('Error joining voice channel:', err);
  }
});

client.login(TOKEN);