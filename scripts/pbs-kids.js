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
        // Use Hubot's built-in Slack message sending capabilities
        const slackMessage = {
          attachments: [
            {
              color: '#36a64f', // Green color for the message
              title: episode.title,
              fields: [
                {
                  title: 'Episode',
                  value: episode.nola_episode,
                  short: true,
                },
                {
                  title: 'Encore Date',
                  value: encoreDate,
                  short: true,
                },
                {
                  title: 'Premier Date',
                  value: premierDate,
                  short: true,
                },
                {
                  title: 'Runtime',
                  value: `${runtime} minutes`,
                  short: true,
                },
              ],
              image_url: `${episode.images['kids-mezzannine-16x9'].url}`, // Episode image
              text: episode.description, // Episode description
            },
          ],
        };

        // Send the message to the Slack room (channel)
        msg.send(slackMessage);
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
