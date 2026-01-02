const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');

let config = require('../config.json');

function loadConfig() {
  delete require.cache[require.resolve('../config.json')];
  config = require('../config.json');
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
  } catch (e) {
    // ignore
  }
  return null;
}

async function joinChannelWithRetries(client, channel, settings, maxAttempts = 3, delayMs = 5000) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const conn = await client.voice.joinChannel(channel, settings);
      return conn;
    } catch (err) {
      lastErr = err;
      const code = getErrorCode(err);
      if (code === 'VOICE_CONNECTION_TIMEOUT') {
        console.warn(`Voice connection timeout (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms...`);
        if (attempt < maxAttempts) await sleep(delayMs);
        continue;
      }
      console.error('joinChannelWithRetries error (non-timeout):', err && (err.stack || err));
      throw err;
    }
  }
  throw lastErr;
}

function start() {
  const CHANNEL_ID = process.env.CHANNEL_ID;
  const TOKEN = process.env.TOKEN;

  const PLAYLIST_LINK = process.env.PLAYLIST_LINK;

  function isSpotifyLink(url) {
    if (!url || typeof url !== 'string') return false;
    return /^https?:\/\/open\.spotify\.com\/.+/i.test(url);
  }

  function findTextChannelForGuild(guild) {
    // prefer explicit env channel id
    const preferredId = process.env.MUSIC_TEXT_CHANNEL_ID || process.env.TEXT_CHANNEL_ID;
    if (preferredId) {
      const ch = guild.channels.cache.get(preferredId);
      if (ch && ch.type === 'GUILD_TEXT') return ch;
    }

    // prefer system channel
    if (guild.systemChannel) return guild.systemChannel;

    // fallback: first writable text channel
    const text = guild.channels.cache.find(c => c.type === 'GUILD_TEXT');
    return text || null;
  }

  async function trySendJockiePlay(client, guild) {
    try {
      if (!PLAYLIST_LINK) return false;
      if (!isSpotifyLink(PLAYLIST_LINK)) return false;
      const ch = findTextChannelForGuild(guild);
      if (!ch) {
        console.warn('No suitable text channel found to send Jockie command');
        return false;
      }
      const cmd = `m!p ${PLAYLIST_LINK}`;
      await ch.send(cmd).catch(err => {
        console.warn('Failed to send Jockie play command:', err && err.message);
      });
      console.log('Sent Jockie play command to', ch.id);
      return true;
    } catch (e) {
      console.error('trySendJockiePlay failed:', e);
      return false;
    }
  }

  const client = new Client();

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

      connection = await joinChannelWithRetries(client, channel, config.settings);
      console.log(`Joined voice channel — staying connected. Name: ${channel.name} | ID: ${channel.id}`);

      // After joining, attempt to trigger Jockie play if configured
      trySendJockiePlay(client, channel.guild).catch(() => {});

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

          console.log('config.json changed — oldSettings:', oldSettings, 'newSettings:', newSettings);

          if (connection && connection.channel && connection.channel.id === CHANNEL_ID) {
            const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
            if (!ch) {
              console.error('Channel not found while applying new config');
              return;
            }

            console.log('Attempting lightweight update via connection.sendVoiceStateUpdate');

            try {
              if (connection && typeof connection.sendVoiceStateUpdate === 'function') {
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
              console.warn('sendVoiceStateUpdate failed, falling back to reconnect:', err && err.message);
            }

            try {
              if (typeof connection.disconnect === 'function') {
                await connection.disconnect().catch(() => {});
              }
              if (typeof connection.destroy === 'function') {
                connection.destroy();
              }
            } catch (e) {
              // ignore
            }

            connection = null;
            await sleep(2000);

            connection = await joinChannelWithRetries(client, ch, newSettings, 3, 7000);
            console.log('Re-applied voice settings from config.json');
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

        connection = await joinChannelWithRetries(client, ch, config.settings, 3, 7000);
        console.log('Reconnected to voice channel.');
      }

      // If we just joined (nowIn true), attempt to send Jockie play command
      if (nowIn) {
        trySendJockiePlay(client, newState.guild).catch(() => {});
      }
    } catch (err) {
      console.error('voiceStateUpdate handler failed:', err);
    }
  });

  client.login(TOKEN);
}

module.exports = { start };
