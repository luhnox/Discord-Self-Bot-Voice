# 🎙️ Discord Self-Bot Voice

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/luhnox/Discord-Self-Bot-Voice?style=social)](https://github.com/luhnox/Discord-Self-Bot-Voice/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/luhnox/Discord-Self-Bot-Voice?style=social)](https://github.com/luhnox/Discord-Self-Bot-Voice/network/members)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-3.0.1-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A powerful Discord self-bot that stays connected to voice channels with command-based control and multi-account support**

[What's New](#whats-new-v300) • [Features](#-features) • [Installation](#-installation) • [Commands](#-commands) • [Configuration](#-configuration) • [Usage](#-usage) • [FAQ](#-faq) • [Docs](#-documentation)

</div>

---

## 🎉 What's New in v3.0.0

### ✨ Major Features
- **🎮 Command-Based Control** - Control bot via Discord messages!
- **📝 JSON Config** - No more `.env` needed, single `config.json` file
- **💬 8+ Commands** - help, settings, set, toggle, and more
- **🔄 Real-Time Updates** - Changes auto-save to config.json
- **👥 User-ID Based** - Manage users by Discord ID
- **⚡ Message Handler** - Listen to Discord messages for commands

### 🆕 New Modules
- `src/config/database.js` - Database manager for config.json
- `src/handlers/commands.js` - Command parser and handler
- `src/events/messageCreate.js` - Message event listener

### 📚 Documentation
- `COMMANDS.md` - Complete command reference
- `QUICKSTART.md` - 5-minute setup guide
- `CONFIG_GUIDE.md` - Configuration details
- `DOCS_INDEX.md` - Documentation index

---

### 🎯 Core Features
- ✅ **Command-Based Control** - Control bot via Discord messages (NEW in v3.0.0!)
- ✅ **Multi-Account Support** - Run multiple accounts simultaneously with independent settings
- ✅ **Single Config File** - JSON-based config.json (replaces .env)
- 🔄 **Auto-Reconnect** - Automatically reconnects when disconnected with exponential backoff
- 🎛️ **Configurable Settings** - Control mute, deafen, and video settings per account
- 🔀 **Dynamic Channel Switching** - Auto-switch or manually switch channels via commands
- 💾 **State Persistence** - Remembers last channel after restart
- 📝 **Advanced Logging** - Logs to console and file with auto-cleanup
- 💬 **Discord Message Commands** - Type commands directly in Discord to control bot

### 🛡️ Stability Features
- ⚡ **Exponential Backoff** - Smart retry delays (2s → 4s → 8s → 16s → 32s)
- 🔢 **Max Reconnect Attempts** - Prevents infinite reconnection loops (max 5 attempts)
- ✔️ **Config Validation** - Validates settings on startup
- 🧹 **Auto Log Cleanup** - Automatically removes old logs (default: 7 days)
- 🛑 **Graceful Shutdown** - Clean disconnect on Ctrl+C

### 📊 Advanced Features
- 🔍 **Per-User Configuration** - Separate settings for each Discord user ID
- 📍 **Per-User Channel ID** - Different voice channels for each account
- 🎮 **8+ Discord Commands** - help, settings list, set offline, set online, mute, deaf, video, channel
- 🔔 **Real-Time Config Updates** - Changes saved instantly to config.json
- 📂 **Organized Logging** - Daily log files with timestamps
- 👤 **Flexible Command Format** - Support both `userid command` and `<@userid> command`

---

## 🚀 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v14.0.0 or higher
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

3. **Configure settings**
   ```bash
   # Edit config.json with your user ID, token, and channel ID
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

5. **Send commands** in Discord
   ```
   YOUR_USER_ID help
   ```

---

## 🎮 Commands

### Available Commands (v3.0.0 NEW!)

| Command | Format | Description |
|---------|--------|-------------|
| **Help** | `userid help` | Show all available commands |
| **Settings List** | `userid settings list` | Display user configuration |
| **Set Offline** | `userid set offline` | Disconnect and set offline |
| **Set Online** | `userid set online` | Set status to online |
| **Toggle Mute** | `userid set settings mute` | Toggle self mute |
| **Toggle Deaf** | `userid set settings deaf` | Toggle self deaf |
| **Toggle Video** | `userid set settings video` | Toggle self video |
| **Set Channel** | `userid set channel <id>` | Change voice channel |

### Command Examples

```
# Get help
1032472108414017576 help

# Check settings
1032472108414017576 settings list

# Toggle mute
1032472108414017576 set settings mute

# Disconnect from voice
1032472108414017576 set offline

# Set voice channel
1032472108414017576 set channel 1449039761489788939

# Mention format also works
<@1032472108414017576> help
```

### Response Examples

**Help Command:**
```
Available Commands:
`<@userid> set offline` - Set user offline and disconnect from voice
`<@userid> set online` - Set user online
`<@userid> settings list` - Show user settings
`<@userid> set settings mute` - Toggle self mute
... and more
```

**Settings List:**
```
Settings for 1032472108414017576:
Status: online
Settings: {
    Self Mute: false,
    Self Deaf: true,
    Self Video: false,
    Channel: 1449039761489788939
}
```

---

---

## ⚙️ Configuration (v3.0.0)

### 📁 File Structure (Updated)
```
Discord-Self-Bot-Voice/
├── src/
│   ├── config/
│   │   ├── database.js         # Config.json manager (NEW)
│   │   └── config.js
│   ├── handlers/
│   │   ├── commands.js         # Command handler (NEW)
│   │   └── configChange.js
│   ├── events/
│   │   ├── messageCreate.js    # Message listener (NEW)
│   │   ├── ready.js
│   │   └── voiceStateUpdate.js
│   └── ...
├── logs/                        # Log files (auto-generated)
├── config.json                  # NEW FORMAT! User-based config
├── config.json.example          # Configuration template
├── index.js
└── package.json
```

### 🔐 Configuration (v3.0.0 - NEW JSON Format!)

Create/edit `config.json`:

```json
[
  {
    "userid": "1032472108414017576",
    "token": "YOUR_TOKEN_HERE",
    "status": "offline",
    "settings": {
      "selfMute": false,
      "selfDeaf": false,
      "selfVideo": false,
      "channel_id": "1449039761489788939"
    }
  }
]
```

### Configuration Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `userid` | string | Discord user ID (18 digits) | ✅ Yes |
| `token` | string | Discord API token | ✅ Yes |
| `status` | string | User status (online/offline) | ✅ Yes |
| `settings.selfMute` | boolean | Auto-mute on join | ⚠️ No |
| `settings.selfDeaf` | boolean | Auto-deafen on join | ⚠️ No |
| `settings.selfVideo` | boolean | Auto-enable video | ⚠️ No |
| `settings.channel_id` | string | Voice channel ID | ⚠️ No |

### How to Get Values

**User ID:** Right-click profile → Copy User ID
**Token:** Open DevTools (F12) → Console → Copy token from localStorage
**Channel ID:** Right-click voice channel → Copy Channel ID

### Multi-User Setup

```json
[
  {
    "userid": "1032472108414017576",
    "token": "TOKEN_1",
    "status": "offline",
    "settings": {
      "selfMute": false,
      "selfDeaf": false,
      "selfVideo": false,
      "channel_id": "1449039761489788939"
    }
  },
  {
    "userid": "9876543210987654321",
    "token": "TOKEN_2",
    "status": "offline",
    "settings": {
      "selfMute": true,
      "selfDeaf": true,
      "selfVideo": false,
      "channel_id": "9876543210987654321"
    }
  }
]
```

---

## 🎮 Usage

### Basic Usage

```bash
# Start the bot
npm start

# Stop the bot
Press Ctrl+C
```

### Single Account Example

**config.json:**
```json
[
  {
    "userid": "1032472108414017576",
    "token": "YOUR_TOKEN_HERE",
    "status": "offline",
    "settings": {
      "selfMute": false,
      "selfDeaf": false,
      "selfVideo": false,
      "channel_id": "1449039761489788939"
    }
  }
]
```

**Then in Discord:**
```
1032472108414017576 help
1032472108414017576 settings list
1032472108414017576 set channel 1449039761489788939
1032472108414017576 set settings mute
1032472108414017576 set offline
```

### Multiple Accounts Example

**config.json:**
```json
[
  {
    "userid": "1032472108414017576",
    "token": "TOKEN_ACCOUNT_1",
    "status": "offline",
    "settings": {
      "selfMute": false,
      "selfDeaf": false,
      "selfVideo": false,
      "channel_id": "1111111111111111111"
    }
  },
  {
    "userid": "9876543210987654321",
    "token": "TOKEN_ACCOUNT_2",
    "status": "offline",
    "settings": {
      "selfMute": true,
      "selfDeaf": true,
      "selfVideo": false,
      "channel_id": "2222222222222222222"
    }
  }
]
```

**Control each account independently:**
```
1032472108414017576 help
9876543210987654321 help

1032472108414017576 set offline
9876543210987654321 set online

1032472108414017576 set settings mute
9876543210987654321 settings list
```

### Real-Time Configuration

All changes are **immediately saved** to config.json:

```
1032472108414017576 set channel 9999999999999999999
# ✅ Channel saved to config.json instantly!

1032472108414017576 set settings mute
# ✅ Setting toggled and saved!

1032472108414017576 set offline
# ✅ Status updated and saved!
```

---

## � Documentation

New comprehensive documentation for v3.0.0:

- **[COMMANDS.md](./COMMANDS.md)** - Complete command reference and examples
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide ⭐ START HERE
- **[CONFIG_GUIDE.md](./CONFIG_GUIDE.md)** - Detailed configuration guide
- **[SETUP_VERIFICATION.md](./SETUP_VERIFICATION.md)** - Setup checklist and verification
- **[DOCS_INDEX.md](./DOCS_INDEX.md)** - Documentation index and quick links

---

### Log Files

Logs are automatically saved to `./logs/discord-bot-YYYY-MM-DD.log`

**Example log:**
```
[2026-02-10T10:30:45.123Z] [INFO] Validating database...
[2026-02-10T10:30:45.456Z] [INFO] Database validation passed
[2026-02-10T10:30:46.789Z] [INFO] [1032472108414017576] username is ready!
[2026-02-10T10:30:47.012Z] [INFO] [1032472108414017576] Joined voice channel — staying connected
[2026-02-10T10:30:50.234Z] [DEBUG] Command: userId=1032472108414017576, cmd=help, args=
```

### Log Levels

| Level | Icon | Description |
|-------|------|-------------|
| `INFO` | ℹ️ | Normal operations and status updates |
| `WARN` | ⚠️ | Warnings and retry attempts |
| `ERROR` | ❌ | Errors and failures |

### Log Retention

Logs older than `LOG_RETENTION_DAYS` are automatically deleted (default: 7 days).

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
[WARN] [1032472108414017576] Detected instant leave from voice (attempt 1/5) — attempting to reconnect...
[INFO] [1032472108414017576] Waiting 2045ms before reconnect attempt...
[INFO] [1032472108414017576] Successfully joined channel
```

### State Persistence

The bot remembers the last channel for each user in `bot-state.json`:

```json
{
  "lastChannelId": {
    "1032472108414017576": "1449039761489788939",
    "9876543210987654321": "9876543210987654321"
  }
}
```

After restart, bots auto-join their last channels.

### Command-Based Control (NEW in v3.0.0!)

Control bot behavior directly from Discord messages:
- No config file editing needed
- Real-time updates
- Flexible command format
- User-friendly responses

**Example:**
```
1032472108414017576 set settings mute
# ✅ Mute toggled and saved instantly!
```

### Graceful Shutdown

Press `Ctrl+C` to trigger graceful shutdown:
1. Disconnect from all voice channels
2. Clean up resources
3. Save state
4. Exit cleanly

---

## 📖 FAQ

### ❓ How do I use commands?
Send messages in Discord with format: `userid command`

Example:
```
1032472108414017576 help
```

### ❓ How many accounts can run?
You can run unlimited accounts! Just add more entries to config.json array.

### ❓ Do I need .env anymore?
No! v3.0.0 uses config.json. .env is optional (legacy support).

### ❓ Can accounts use different channels?
Yes! Each user in config.json has independent `channel_id` setting.

### ❓ How do I change settings?
Use commands in Discord:
```
userid set settings mute        # Toggle mute
userid set channel 123456       # Set channel
userid set offline              # Disconnect
```

Or edit config.json directly (will auto-load).

### ❓ What happens on disconnect?
Auto-reconnect with exponential backoff (max 5 attempts).

### ❓ Where are logs?
In `./logs/` folder by date: `discord-bot-YYYY-MM-DD.log`

### ❓ Is using self-bots against Discord ToS?
⚠️ **Yes.** Use at your own risk. Self-botting can result in account termination.

---

## 🛠️ Troubleshooting

### Common Issues

#### ❌ "No tokens found"
**Solution:** Add tokens to config.json, ensure field name is `token`

#### ❌ "User not found in configuration"
**Solution:** Check userid in config.json matches the one you're using in commands

#### ❌ "Voice channel not found"
**Solutions:**
- Verify channel ID is correct (18 digits)
- Ensure account can access the channel
- Make sure it's a voice/stage channel (not text)

#### ❌ Bot doesn't respond to commands
**Solutions:**
- Check message format: `userid command`
- Verify userid in config.json
- Ensure bot can see messages in channel
- Check logs for error messages

#### ❌ Config not saving
**Solutions:**
- Check file permissions
- Verify JSON syntax is valid
- Check disk space
- Try restart bot

#### ⚠️ "Voice connection timeout"
**Normal behavior** - Bot will retry with exponential backoff

#### ❌ Bot crashes
**Solutions:**
- Check Node.js version (v14+)
- Check dependencies: `npm list`
- Review logs in `./logs/`
- Try: `npm install` again

---

## 📝 Changelog

### v3.0.1 (Latest - Bug Fixes)
- ✅ **Respect Offline Status** - Users with offline status won't auto-join voice (but still receive commands)
- ✅ **Debug Log Validation** - Only log DEBUG for valid users in database
- ✅ **Reduced Log Spam** - Silently skip commands from unknown users
- 🔧 **Better Status Control** - Status field controls voice join behavior, not command access
- 📊 **Improved Transparency** - Clear INFO logs when skipping voice join for offline users

### v3.0.0 ⭐ (Major Update!)
- ✨ **Command-Based Control** - Control bot via Discord messages!
- ✨ **JSON Config System** - Replaced .env with config.json
- ✨ **8+ Commands** - help, settings, set, toggle, and more
- ✨ **Real-Time Updates** - Changes auto-save to config.json
- ✨ **User-ID Based Management** - Manage users by Discord ID
- ✨ **Message Event Handler** - Listen to Discord messages
- ✨ **Database Module** - Robust config.json manager
- ✨ **Command Parser** - Smart command parsing and validation
- ✨ **Comprehensive Docs** - 4 new documentation files
- ✨ **Testing Utility** - Command testing script
- 🔄 **Backward Compatible** - .env still supported (legacy)

### v2.0.0
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
