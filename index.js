const { Client } = require('discord.js-selfbot-v13');

// Enable werift debug logging for voice troubleshooting
process.env.DEBUG = process.env.DEBUG || 'werift*';

// Explicit intents to ensure voice state events are received
const client = new Client({ intents: ['GUILDS', 'GUILD_VOICE_STATES', 'GUILD_MEMBERS'] });

const CHANNEL_ID = process.env.CHANNEL_ID;
const TOKEN = process.env.TOKEN;

process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection:', err);
});

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);
  try {
    let channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel) return console.error('Voice channel not found (invalid ID or not cached)');
    if (channel.type !== 'GUILD_VOICE' && channel.type !== 2) return console.error('Channel is not a voice channel');

    // Join voice initially and keep the connection reference
    let connection = await client.voice.joinChannel(channel, {
      selfMute: false,
      selfDeaf: false,
      selfVideo: false,
    });
    console.log(`Joined voice channel — staying connected. Name: ${channel.name} | ID: ${channel.id}`);

    // --- Auto-reconnect: use voiceStateUpdate event for immediate reconnects (no polling)
    client.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const myId = client.user.id;
        const left = oldState && oldState.id === myId && oldState.channelId === CHANNEL_ID;
        const nowIn = newState && newState.id === myId && newState.channelId === CHANNEL_ID;
        if (left && !nowIn) {
          console.warn('Detected instant leave from voice — attempting to reconnect...');
          const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
          if (!ch) return console.error('Reconnect failed: channel not found');
          connection = await client.voice.joinChannel(ch, {
            selfMute: false,
            selfDeaf: false,
            selfVideo: false,
          });
          console.log('Reconnected to voice channel.');
        }
      } catch (err) {
        console.error('voiceStateUpdate handler failed:', err);
      }
    });
    // --- end auto-reconnect
  } catch (err) {
    console.error('Error joining voice channel:', err);
  }
});

client.login(TOKEN);