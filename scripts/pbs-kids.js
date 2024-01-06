// Description
//   PBS Kids Programming
//
// Configuration
//   HUBOT_PBS_SHOWS - Comma separated list of show IDs.
//
// Commands
//   hubot pbs - Show configured shows available on the PBS Kids app
//   hubot sesame - Show available Sesame Street episodes on PBS Kids app

module.exports = (robot) => {
  const configuredShows = process.env.HUBOT_PBS_SHOWS || 'sesame-street,daniel-tigers-neighborhood';
  const baseUrl = 'https://producerplayer.services.pbskids.org/show-list/';

  const displayShowData = (shows, msg) => robot.http(baseUrl).query({
    shows,
    available: 'public',
    sort: '-encored_on',
    type: 'episode',
  }).get()((err, res, body) => {
    let episodes;
    try {
      episodes = JSON.parse(body);
    } catch (error2) {
      robot.logger.error(error2);
      return;
    }
    episodes.items.forEach((episode) => {
      const premierDate = (new Date(episode.premiered_on)).toLocaleDateString();
      const encoreDate = (new Date(episode.encored_on)).toLocaleDateString();
      const runtime = Math.round(episode.duration / 60);

      if (/slack/.test(robot.adapterName)) {
        // eslint-disable-next-line global-require
        const { WebClient } = require('@slack/web-api');
        const slackWebClient = new WebClient(process.env.HUBOT_SLACK_TOKEN);
        const payload = {
          as_user: false,
          username: 'PBS Kids',
          icon_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/PBS_Kids_logo_%282022%29.svg/240px-PBS_Kids_logo_%282022%29.svg.png',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: episode.title,
              },
            },
            {
              type: 'image',
              image_url: `${episode.images['kids-mezzannine-16x9'].url}`,
              alt_text: episode.title,
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Episode:* ${episode.nola_episode}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Encore Date:* ${encoreDate}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Premier Date:* ${premierDate}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Runtime:* ${runtime} minutes`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: episode.description,
              },
            },
          ],
          channel: msg.message.room,
        };
        slackWebClient.chat.postMessage(payload);
        return;
      }
      msg.send(`${encoreDate}: ${episode.title}`);
      msg.send(`  ${episode.description} (${runtime} minutes)`);
    });
  });

  robot.respond(/(pbs|pbs kids)$/i, (msg) => displayShowData(configuredShows, msg));

  // Shortcut to Sesame Street
  robot.respond(/(?:sesame|sesame street|elmo)(?: episodes)?/i, (msg) => displayShowData('sesame-street', msg));
};
