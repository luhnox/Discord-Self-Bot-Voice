# 🎙️ Discord Self-Bot Voice

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/luhnox/Discord-Self-Bot-Voice?style=social)](https://github.com/luhnox/Discord-Self-Bot-Voice/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/luhnox/Discord-Self-Bot-Voice?style=social)](https://github.com/luhnox/Discord-Self-Bot-Voice/network/members)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A powerful Discord self-bot that stays connected to voice channels with multi-account support**

[Features](#-features) • [Installation](#-installation) • [Configuration](#-configuration) • [Usage](#-usage) • [FAQ](#-faq)

</div>

---

## 📋 Features

### 🎯 Core Features
- ✅ **Multi-Account Support** - Run up to 2 accounts simultaneously (MAIN + SECOND)
- 🔄 **Auto-Reconnect** - Automatically reconnects when disconnected with exponential backoff
- 🎛️ **Configurable Settings** - Control mute, deafen, and video settings per account
- 🔀 **Dynamic Channel Switching** - Auto-switch channels when config changes
- 💾 **State Persistence** - Remembers last channel after restart
- 📝 **Advanced Logging** - Logs to console and file with auto-cleanup

### 🛡️ Stability Features
- ⚡ **Exponential Backoff** - Smart retry delays (2s → 4s → 8s → 16s → 32s)
- 🔢 **Max Reconnect Attempts** - Prevents infinite reconnection loops (max 5 attempts)
- ✔️ **Config Validation** - Validates settings on startup
- 🧹 **Auto Log Cleanup** - Automatically removes old logs (default: 7 days)
- 🛑 **Graceful Shutdown** - Clean disconnect on Ctrl+C

### 📊 Advanced Features
- 🔍 **Per-Token Configuration** - Separate settings for each account
- 📍 **Per-Token Channel ID** - Different voice channels for each account
- 🔔 **Hot Reload** - Apply config changes without restart
- 📂 **Organized Logging** - Daily log files with timestamps

---

## 🚀 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v16.0.0 or higher
- Discord user token(s)
- Git (optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/luhnox/Discord-Self-Bot-Voice.git
   cd Discord-Self-Bot-Voice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy .env.example to .env (or create new .env)
   # Add your tokens
   ```

4. **Configure settings**
   ```bash
   # Edit config.json with your channel IDs and preferences
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

---

## ⚙️ Configuration

### 📁 File Structure
```
Discord-Self-Bot-Voice/
├── src/
│   └── app.js          # Main application logic
├── logs/               # Log files (auto-generated)
├── .env                # Environment variables (tokens)
├── config.json         # Bot configuration
├── bot-state.json      # State persistence (auto-generated)
├── index.js            # Entry point
└── package.json
```

### 🔐 Environment Variables (`.env`)

Create a `.env` file in the root directory:

```env
# Required: At least one token must be provided
MAIN_TOKEN=your_main_discord_token_here
SECOND_TOKEN=your_second_discord_token_here

# Optional: Override channel ID from config.json
CHANNEL_ID=1234567890123456789

# Optional: Log retention in days (default: 7)
LOG_RETENTION_DAYS=7
```

#### How to Get Your Discord Token
⚠️ **Warning:** Never share your token with anyone!

1. Open Discord in your browser
2. Press `F12` to open Developer Tools
3. Go to the `Console` tab
4. Paste: `(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`
5. Press Enter - your token will appear

### 📝 Bot Configuration (`config.json`)

```json
{
    "main": {
        "selfMute": false,
        "selfDeaf": false,
        "selfVideo": false,
        "CHANNEL_ID": "1234567890123456789"
    },
    "second": {
        "selfMute": true,
        "selfDeaf": true,
        "selfVideo": false,
        "CHANNEL_ID": "9876543210987654321"
    }
}
```

#### Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `selfMute` | boolean | Self-mute when joining voice | `false` |
| `selfDeaf` | boolean | Self-deafen when joining voice | `false` |
| `selfVideo` | boolean | Enable video when joining voice | `false` |
| `CHANNEL_ID` | string | Voice channel ID to join | Required |

#### Multi-Account Setup

- **`main`** - Configuration for MAIN_TOKEN
- **`second`** - Configuration for SECOND_TOKEN

Each account can have:
- Different channel IDs
- Different voice settings
- Independent reconnection behavior

---

## 🎮 Usage

### Basic Usage

```bash
# Start the bot
npm start

# Stop the bot
Press Ctrl+C
```

### Single Account

**`.env`:**
```env
MAIN_TOKEN=your_token_here
```

**`config.json`:**
```json
{
    "main": {
        "selfMute": false,
        "selfDeaf": false,
        "selfVideo": false,
        "CHANNEL_ID": "1234567890123456789"
    }
}
```

### Multiple Accounts (Simultaneous)

**`.env`:**
```env
MAIN_TOKEN=first_account_token
SECOND_TOKEN=second_account_token
```

**`config.json`:**
```json
{
    "main": {
        "selfMute": false,
        "selfDeaf": true,
        "selfVideo": false,
        "CHANNEL_ID": "1111111111111111111"
    },
    "second": {
        "selfMute": true,
        "selfDeaf": true,
        "selfVideo": false,
        "CHANNEL_ID": "2222222222222222222"
    }
}
```

### Hot Reload Configuration

Edit `config.json` while the bot is running to:
- Change voice settings (mute/deafen/video)
- Switch to a different channel ID
- Apply changes without restarting

---

## 📊 Logging

### Log Files

Logs are automatically saved to `./logs/discord-bot-YYYY-MM-DD.log`

**Example log:**
```
[2026-02-08T10:30:45.123Z] [INFO] Validating configuration...
[2026-02-08T10:30:45.456Z] [INFO] Configuration validation passed
[2026-02-08T10:30:46.789Z] [INFO] [MAIN] luhnox is ready!
[2026-02-08T10:30:47.012Z] [INFO] [MAIN] Successfully joined channel: General Voice (ID: 1234567890123456789)
[2026-02-08T10:30:47.234Z] [INFO] [SECOND] luhnox2 is ready!
[2026-02-08T10:30:47.456Z] [INFO] [SECOND] Successfully joined channel: AFK Channel (ID: 9876543210987654321)
```

### Log Levels

| Level | Icon | Description |
|-------|------|-------------|
| `INFO` | ℹ️ | Normal operations and status updates |
| `WARN` | ⚠️ | Warnings and retry attempts |
| `ERROR` | ❌ | Errors and failures |

### Log Retention

Logs older than `LOG_RETENTION_DAYS` are automatically deleted.

**Set retention:**
```env
LOG_RETENTION_DAYS=7  # Keep logs for 7 days
```

**Monitor logs in real-time:**
```bash
# Windows PowerShell
Get-Content -Path ".\logs\discord-bot-*.log" -Wait -Tail 50

# Linux/Mac
tail -f ./logs/discord-bot-*.log
```

---

## 🔧 Advanced Features

### Auto-Reconnection

When disconnected, the bot will:
1. Detect the disconnect
2. Wait with exponential backoff (2s → 4s → 8s → 16s → 32s, max 60s)
3. Retry up to 5 times
4. Stop after max attempts (manual restart required)

**Example log:**
```
[WARN] [MAIN] Detected instant leave from voice (attempt 1/5) — attempting to reconnect...
[INFO] [MAIN] Waiting 2045ms before reconnect attempt...
[INFO] [MAIN] Successfully joined channel: General Voice (ID: 1234567890123456789)
```

### State Persistence

The bot remembers the last channel for each account in `bot-state.json`:

```json
{
  "lastChannelId": {
    "MAIN": "1234567890123456789",
    "SECOND": "9876543210987654321"
  }
}
```

After restart, bots auto-join their last channels.

### Graceful Shutdown

Press `Ctrl+C` to trigger graceful shutdown:
1. Disconnect from all voice channels
2. Clean up resources
3. Save state
4. Exit cleanly

---

## 📖 FAQ

### ❓ How many accounts can run simultaneously?
Currently supports 2 accounts (MAIN_TOKEN + SECOND_TOKEN). Both join voice at the same time.

### ❓ Can each account join different channels?
Yes! Configure different `CHANNEL_ID` in `config.json` for `main` and `second`.

### ❓ What happens if the bot disconnects?
Auto-reconnect kicks in with exponential backoff. Max 5 attempts before stopping.

### ❓ How do I switch channels without restarting?
Edit `CHANNEL_ID` in `config.json`. The bot will detect the change and switch automatically.

### ❓ Where are the logs stored?
In `./logs/` folder. Files are named by date: `discord-bot-YYYY-MM-DD.log`

### ❓ How do I clean old logs?
Automatic! Logs older than `LOG_RETENTION_DAYS` (default 7) are deleted daily.

### ❓ Is using self-bots against Discord ToS?
⚠️ **Yes.** Use at your own risk. Self-botting can result in account termination.

### ❓ Bot says "Voice channel not found"
- Verify `CHANNEL_ID` is correct
- Ensure the account has access to the channel
- Check if it's a voice/stage channel (not text)

### ❓ How do I get channel ID?
1. Enable Developer Mode in Discord (Settings → Advanced)
2. Right-click the voice channel
3. Click "Copy ID"

---

## 🛠️ Troubleshooting

### Common Issues

#### ❌ "No tokens found"
**Solution:** Add `MAIN_TOKEN` and/or `SECOND_TOKEN` to `.env`

#### ❌ "CHANNEL_ID not found"
**Solution:** Add `CHANNEL_ID` to config.json or .env

#### ❌ "Voice channel not found (invalid ID or not cached)"
**Solutions:**
- Verify channel ID is correct
- Ensure account can access the channel
- Bot must be in the same server as the channel

#### ❌ Bot disconnects immediately
**Solutions:**
- Check if you have permissions in the channel
- Verify token is valid and not expired
- Check Discord server status

#### ⚠️ "Voice connection timeout"
**Normal behavior** - Bot will retry with exponential backoff

---

## 📝 Changelog

### v2.0.0 (Latest)
- ✨ Multi-account support (MAIN + SECOND)
- ✨ Per-token configuration
- ✨ Auto log cleanup
- ✨ Exponential backoff retry
- ✨ Max reconnect attempts
- ✨ State persistence
- ✨ Config validation
- ✨ Graceful shutdown

### v1.0.0
- 🎉 Initial release
- ✅ Basic voice connection
- ✅ Auto-reconnect
- ✅ Hot reload config

---

## ⚠️ Disclaimer

This project is for **educational purposes only**. Using self-bots violates [Discord's Terms of Service](https://discord.com/terms). Your account may be terminated if detected. Use at your own risk.

**The author is not responsible for:**
- Account bans or terminations
- Any misuse of this software
- Violations of Discord's Terms of Service

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 💖 Support

If you find this project helpful:
- ⭐ Star the repository
- 🍴 Fork and contribute
- 🐛 Report bugs via [Issues](https://github.com/luhnox/Discord-Self-Bot-Voice/issues)

---

## 👤 Author

**luhnox**
- GitHub: [@luhnox](https://github.com/luhnox)
- Repository: [Discord-Self-Bot-Voice](https://github.com/luhnox/Discord-Self-Bot-Voice)

---

<div align="center">

**Made with ❤️ by luhnox**

⭐ Star this repo if you find it useful!

</div>
