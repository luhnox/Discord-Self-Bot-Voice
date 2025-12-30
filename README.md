# Discord Self-Bot (Voice)

[![Stars](https://img.shields.io/github/stars/luhnox/Discord-SelfBot-Voice?style=flat&logo=github)](https://github.com/luhnox/Discord-SelfBot-Voice/stargazers) [![Watchers](https://img.shields.io/github/watchers/luhnox/Discord-SelfBot-Voice?style=flat&logo=github)](https://github.com/luhnox/Discord-SelfBot-Voice/watchers) [![Forks](https://img.shields.io/github/forks/luhnox/Discord-SelfBot-Voice?style=flat&logo=github)](https://github.com/luhnox/Discord-SelfBot-Voice/network/members)

Brief: this project is a "self-bot" that maintains a persistent voice connection on Discord.

Important: Running self-bots violates Discord's Terms of Service. Use this repository for education or experimentation only and at your own risk.

## Features
- Keeps a voice connection alive
- Simple configuration and run process

## Automatic Stars / Watchers / Forks badges

The badges above use Shields.io and will display values automatically from the GitHub repository. To make them work, replace `luhnox/Discord-SelfBot-Voice` in the badge URLs with your GitHub owner and repository name, or add repository metadata to `package.json`:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/luhnox/Discord-SelfBot-Voice.git"
}
```

Once the project is pushed to GitHub (or the `luhnox/Discord-SelfBot-Voice` is set), the badges will show the number of Stars, Watchers, and Forks automatically.

## Requirements
- Node.js (LTS recommended)
- A Discord token (keep this secret)

## Setup & Run

1. Install dependencies:

```bash
npm install
```

2. Configure your Discord token:

- Option A (environment variable):

```powershell
setx DISCORD_TOKEN "your_token_here"
```

- Option B (.env file): create a `.env` file in the project root with:

```
DISCORD_TOKEN=your_token_here
```

You can also edit `index.js` directly if the token is defined there.

3. Run the project:

```bash
npm start
```

## Quick Usage

Once started, the bot will attempt to maintain the voice connection according to the settings in `index.js`.

## Troubleshooting
- Authentication errors: verify the token is correct and available to the process.
- Repeated disconnects: check terminal logs and confirm the account status with Discord.