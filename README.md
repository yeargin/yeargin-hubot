# Yeargin Hubot

[![Node CI](https://github.com/yeargin/yeargin-hubot/actions/workflows/nodejs.yml/badge.svg)](https://github.com/yeargin/yeargin-hubot/actions/workflows/nodejs.yml)

A [Hubot](https://hubot.github.com/) chatbot instance connected to Slack, with Redis for persistence.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Slack app with Socket Mode enabled
- Required tokens (see Environment Variables below)
- Redis instance (local or remote)

### Setup

1. **Configure environment variables:**
   ```bash
   cp .env-dist .env
   # Edit .env with your actual tokens
   ```

2. **Run locally (shell adapter for testing):**
   ```bash
   npm run local
   ```

3. **Run with Slack adapter:**
   ```bash
   # Load environment variables and start Hubot
   source .env
   npm start
   ```

## Development

### Writing Custom Scripts

Scripts live in `scripts/` and are auto-loaded at startup. Each script should follow this pattern:

```javascript
// Description
//   Brief description of what the script does
//
// Commands
//   hubot command <args> - What it does
//
// Configuration (optional)
//   ENV_VAR_NAME - Purpose

module.exports = (robot) => {
  robot.respond(/pattern/i, (msg) => {
    // Command logic here
  });
};
```

**Key concepts:**
- `robot.respond(/pattern/)` - Matches when bot is mentioned
- `robot.hear(/pattern/)` - Matches any message in channel
- Use `msg.send()` to reply
- Access environment variables via `process.env.VAR_NAME`
- Use `robot.http(url)` for HTTP requests

### Adding External Scripts

1. Install the package: `npm install <package-name>`
2. Add to `external-scripts.json`
3. Restart the bot

### Testing

```bash
npm test  # Validates environment configuration
```

### Environment Variables

Core variables needed (see `.env-dist` for complete list):
- `HUBOT_SLACK_APP_TOKEN` - Slack app-level token (starts with `xapp-`)
- `HUBOT_SLACK_BOT_TOKEN` - Slack bot token (starts with `xoxb-`)
- `REDIS_URL` - Set to your Redis server (e.g., `redis://localhost:6379`)

Service-specific scripts may require additional API keys.

## Deployment

Deployment can be triggered via custom Jenkins integration (see `scripts/deploy.js`).
