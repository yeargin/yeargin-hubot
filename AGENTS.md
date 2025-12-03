# Yeargin Hubot - AI Coding Agent Instructions

## Project Overview

This is a **Hubot** chatbot instance designed for Slack integration. Hubot is GitHub's chat automation framework built on Node.js. This bot provides custom commands for Nashville-area services, organizational tools, and home automation.

## Architecture

### Component Structure
- **Adapter**: `@hubot-friends/hubot-slack` - connects to Slack using Socket Mode
- **Brain**: `hubot-redis-brain` - persists data in Redis
- **Scripts**: Two types
  - **External scripts** (`external-scripts.json`): npm packages auto-loaded from `node_modules/`
  - **Custom scripts** (`scripts/*.js`): organization-specific commands

### Runtime
The bot runs with the Slack adapter (`@hubot-friends/hubot-slack`) and persists data via `hubot-redis-brain`. Configure environment in `.env` (copy from `.env-dist`).

## Development Workflow

### Local Testing
```bash
# Setup environment
cp .env-dist .env
# Edit .env with actual tokens

# Run locally (shell adapter)
npm run local

# Run with Slack adapter
source .env
npm start
```

### Testing Commands
```bash
npm test  # Validates environment config (hubot-dotenv --config-check)
```

### Deployment
Custom Jenkins-based deployment via `scripts/deploy.js`:
```
!deploy          # Deploy main branch
!deploy <branch> # Deploy specific branch
```
Requires: `HUBOT_JENKINS_URL`, `HUBOT_JENKINS_USER`, `HUBOT_JENKINS_AUTH_TOKEN`, `HUBOT_JENKINS_JOB`

## Script Development Patterns

### Script Structure Template
All custom scripts follow this pattern (see `scripts/nfd-incidents.js`):

```javascript
// Description
//   Brief description
//
// Commands
//   hubot command - What it does
//
// Configuration (optional)
//   ENV_VAR_NAME - Purpose

module.exports = (robot) => {
  robot.respond(/pattern/i, (msg) => {
    // Command logic
  });
};
```

### Key Patterns

1. **Regex matching**: Use `robot.respond()` for commands that mention the bot, `robot.hear()` for ambient listening
   - Example: `robot.respond(/fire\s?(\d{5})?/i)` matches "hubot fire 37209"

2. **Slack-specific formatting**: Check adapter name before using Slack features
   ```javascript
   if (/slack/.test(robot.adapterName)) {
     msg.send(`\`\`\`\n${table}\n\`\`\``);  // Code block
   }
   ```

3. **Slack Block Kit messages**: For rich formatting, use Slack Web API directly (see `scripts/sigep.js`)
   ```javascript
   const { WebClient } = require('@slack/web-api');
   const slackWebClient = new WebClient(process.env.HUBOT_SLACK_BOT_TOKEN);
   slackWebClient.chat.postMessage({ /* payload */ });
   ```

4. **Thread support**: Get thread ID from raw message (see `scripts/deploy.js`)
   ```javascript
   const threadId = msg.message.rawMessage.ts;
   msg.send({ attachments: [...], thread_ts: threadId });
   ```

5. **HTTP requests**: Use Hubot's scoped HTTP client
   ```javascript
   robot.http(url).query(params).get()((err, res, body) => { /* ... */ });
   ```

6. **Date/time handling**: Use `dayjs` with timezone support (see `scripts/nfd-incidents.js`)
   ```javascript
   const dayjs = require('dayjs');
   require('dayjs/plugin/relativeTime');
   dayjs.tz.setDefault('America/Chicago');
   ```

### Common Dependencies
- `dayjs`: Date manipulation (with `relativeTime`, `timezone`, `utc` plugins)
- `ascii-table`: Console-friendly table formatting
- `@slack/web-api`: Advanced Slack API features
- `lodash`: Utility functions (imported as needed with `require('lodash')`)

## Code Style

Uses **Airbnb ESLint** config (`.eslintrc.js`):
- ES2021 syntax
- No semicolons enforced
- Environment set for browser and Node.js

## Environment Variables

Critical variables (see `.env-dist` for complete list):
- `HUBOT_SLACK_APP_TOKEN` / `HUBOT_SLACK_BOT_TOKEN`: Slack Socket Mode auth
- `REDIS_URL`: Set to your Redis server (e.g., `redis://localhost:6379`)
- Service-specific: Most external scripts require API keys (Fitbit, Mailchimp, etc.)

## Custom Scripts Overview

- **deploy.js**: Trigger Jenkins deployments via Slack
- **nfd-incidents.js**: Nashville Fire Department active incidents via ArcGIS API
- **pbs-kids.js**: PBS Kids episode listings
- **sigep.js**: Sigma Phi Epsilon fraternity chapter lookup/stats
- **yubikey.js**: Auto-invalidate accidentally pasted YubiKey OTPs

## Testing New Scripts

1. Add script to `scripts/` directory
2. Restart the bot process
3. Test in Slack with `!help` to verify registration
4. Use `HUBOT_LOG_LEVEL=debug` in `.env` for troubleshooting

## CI/CD

GitHub Actions (`.github/workflows/nodejs.yml`):
- Tests on Node 18.x, 20.x, 22.x
- Authenticates to GitHub Packages for scoped dependencies
- Runs config check via `npm test`
