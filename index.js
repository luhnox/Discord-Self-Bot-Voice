const originalLog = console.log;
const originalInfo = console.info;
console.log = () => { };
console.info = () => { };
require('dotenv').config();
console.log = originalLog;
console.info = originalInfo;

const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
let config = require('./config.json');

function loadConfig() {
  delete require.cache[require.resolve('./config.json')];
  config = require('./config.json');
  return config;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  } catch { }
  return null;
}

process.env.DEBUG = process.env.DEBUG || 'werift*';

const client = new Client();

/** @type {import('discord.js-selfbot-v13').VoiceConnection | null} */
let connection = null;

const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('[FATAL] TOKEN is not set in .env');
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error('[FATAL] CHANNEL_ID is not set in .env');
  process.exit(1);
}

if (!config || !config.settings) {
  console.error('[FATAL] config.settings is missing in config.json');
  process.exit(1);
}

async function joinChannelWithRetries(channel, settings, maxAttempts = 3, delayMs = 5000) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const opts = {
        selfMute: !!settings.selfMute,
        selfDeaf: !!settings.selfDeaf,
        selfVideo: !!settings.selfVideo,
        self_mute: !!settings.selfMute,
        self_deaf: !!settings.selfDeaf,
        self_video: !!settings.selfVideo,
      };
      const conn = await client.voice.joinChannel(channel, opts);
      return conn;
    } catch (err) {
      lastErr = err;
      const code = getErrorCode(err);
      if (code === 'VOICE_CONNECTION_TIMEOUT') {
        console.warn(
          `Voice connection timeout (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`,
        );
        if (attempt < maxAttempts) await sleep(delayMs);
        continue;
      }
      console.error(
        'joinChannelWithRetries error (non-timeout):',
        err && (err.stack || err),
      );
      throw err;
    }
  }
  throw lastErr;
}

process.on('unhandledRejection', err => {
  console.error('UnhandledRejection:', err);
});

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);

  try {
    let channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
      channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    }

    if (!channel) {
      console.error(
        `[FATAL] Voice channel not found for CHANNEL_ID=${CHANNEL_ID}. Check .env value.`,
      );
      process.exit(1);
    }

    if (channel.type !== 'GUILD_VOICE' && channel.type !== 2) {
      console.error(
        `[FATAL] Channel ${CHANNEL_ID} is not a voice channel (type=${channel.type}).`,
      );
      process.exit(1);
    }

    connection = await joinChannelWithRetries(channel, config.settings, 3, 7000);
    console.log(
      `Joined voice channel — staying connected. Name: ${channel.name} | ID: ${channel.id}`,
    );

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

        console.log(
          'config.json changed — oldSettings:',
          oldSettings,
          'newSettings:',
          newSettings,
        );

        if (connection && connection.channel && connection.channel.id === CHANNEL_ID) {
          const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
          if (!ch) {
            console.error('Channel not found while applying new config');
            return;
          }

          console.log(
            'Applying new voice settings via sendVoiceStateUpdate (mute/deaf/video).',
          );

          try {
            if (typeof connection.sendVoiceStateUpdate === 'function') {
              await connection.sendVoiceStateUpdate({
                channel_id: CHANNEL_ID,
                self_mute: !!newSettings.selfMute,
                self_deaf: !!newSettings.selfDeaf,
                self_video: !!newSettings.selfVideo,
              });
              console.log('Applied voice state via sendVoiceStateUpdate.');
              return;
            }
          } catch (err) {
            console.warn(
              'sendVoiceStateUpdate failed, falling back to reconnect:',
              err && err.message,
            );
          }

          try {
            if (connection && typeof connection.disconnect === 'function') {
              try {
                await connection.disconnect();
              } catch { }
            }
            if (connection && typeof connection.destroy === 'function') {
              connection.destroy();
            }
          } catch { }

          connection = null;
          await sleep(2000);

          connection = await joinChannelWithRetries(ch, newSettings, 3, 7000);
          console.log('Re-applied voice settings from config.json via reconnect.');
        }
      } catch (e) {
        console.error('Failed to reload config.json / apply new settings:', e);
      }
    });
  } catch (e) {
    console.error('Error joining voice channel:', e);
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const myId = client.user.id;

    const left =
      oldState && oldState.id === myId && oldState.channelId === CHANNEL_ID;

    const nowIn =
      newState && newState.id === myId && newState.channelId === CHANNEL_ID;

    if (left && !nowIn) {
      console.warn(
        'Detected leave from target voice channel — attempting to reconnect...',
      );

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

client.login(TOKEN);