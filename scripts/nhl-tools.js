const registry = require('hubot-ollama/src/tool-registry')
const fetch = require('node-fetch')

// NHL standings
registry.registerTool('get_nhl_standings', {
  description: 'Gets NHL standings for any date (current or historical). Returns all teams and divisions.',
  parameters: {
    type: 'object',
    required: [],
    properties: {
      date: {
        type: 'string',
        description: 'Standings as of this date in YYYY-MM-DD format. Use specific dates for historical data, or omit for current standings. Use America/New_York for date/time calculations.'
      }
    },
  },
  handler: async ({ date }) => {
    let useDate = date;
    if (!date) {
      useDate = 'now';
    }
    const response = await fetch(`https://api-web.nhle.com/v1/standings/${useDate}`);
    return (await response).json();
  }
});

// NHL Scoreboard
registry.registerTool('get_nhl_scores', {
  description: 'Gets NHL scoreboard for any date (current or historical).',
  parameters: {
    type: 'object',
    required: [],
    properties: {
      date: {
        type: 'string',
        description: 'Games on this date in YYYY-MM-DD format. Use specific dates for historical data, or omit for today. Use America/New_York for date/time calculations. All relative links are prefixed with `https://nhl.com/`.'
      }
    },
  },
  handler: async ({ date }) => {
    let useDate = date;
    if (!date) {
      useDate = 'now';
    }
    const response = await fetch(`https://api-web.nhle.com/v1/score/${useDate}`);
    return (await response).json();
  }
});
