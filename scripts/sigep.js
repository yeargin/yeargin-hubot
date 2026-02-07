// Description:
//   Interacts with the SigEp website
//
// Commands:
//   hubot sigep chapters - Gets chapter count
//   hubot sigep manpower - Gets total manpower
//   hubot sigep website - List most recently updated pages
//

const _ = require('lodash');

module.exports = (robot) => {
  const makeAPIRequest = (method, path, payload, callback) => {
    if (method.toUpperCase() === 'GET') {
      return robot.http(`https://sigep.org/${path}`)
        .query(payload)
        .get()((err, res, body) => {
          callback(err, res, body);
        });
    }

    if (method.toUpperCase() === 'POST') {
      const data = JSON.stringify(payload);
      return robot.http(`https://sigep.org/${path}`)
        .post(data)((err, res, body) => {
          callback(err, res, body);
        });
    }

    robot.logger.error(`Invalid method: ${method}`);
    return callback('Invalid method!');
  };

  // Active chapter count
  robot.respond(/sigep chapters$/i, (msg) => makeAPIRequest('GET', 'wp-admin/admin-ajax.php', {
    action: 'wp_ajax_ninja_tables_public_action',
    table_id: 18473,
    target_action: 'get-all-data',
    default_sorting: 'old_first',
  }, (err, _res, body) => {
    if (err) {
      robot.logger.error(err);
      msg.send(`Error: ${err}`);
      return;
    }

    try {
      const chapters = JSON.parse(body);
      const filteredChapters = chapters.filter((row) => row.chapterdesignation !== '');
      msg.send(`There are ${filteredChapters.length} active chapters.`);
    } catch (parseError) {
      robot.logger.error(parseError);
    }
  }));

  // Chapter information lookup
  robot.respond(/sigep chapter (.*)$/i, (msg) => {
    const search = msg.match[1];
    if (!search) {
      msg.send('No search term provided.');
      return;
    }

    makeAPIRequest('GET', 'wp-admin/admin-ajax.php', {
      action: 'wp_ajax_ninja_tables_public_action',
      table_id: 18473,
      target_action: 'get-all-data',
      default_sorting: 'old_first',
    }, (err, _res, body) => {
      if (err) {
        robot.logger.error(err);
        msg.send(`Error: ${err}`);
        return;
      }
      try {
        const chapters = JSON.parse(body);
        const filteredChapter = chapters.find((row) => (
          row.chapterdesignation.toUpperCase() === search.toUpperCase()
            || row.dyadinstitutionalid.match(new RegExp(search, 'i'))
        ));
        if (filteredChapter) {
          const fallback = `${filteredChapter.chapterdesignation} - ${filteredChapter.dyadinstitutionalid}\nManpower: ${filteredChapter.currentchaptersize} - ${filteredChapter.website}`;
          const adapterName = robot.adapter?.name ?? robot.adapterName ?? '';
          if (/slack/i.test(adapterName)) {
            const { WebClient } = require('@slack/web-api');
            const slackWebClient = new WebClient(process.env.HUBOT_SLACK_BOT_TOKEN);
            const payload = {
              as_user: false,
              username: 'SigEp',
              icon_url: 'https://sigep.org/wp-content/uploads/2016/12/cropped-Jqv6fL0f-180x180.jpg',
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: filteredChapter.chapterdesignation,
                  },
                },
                {
                  accessory: {
                    type: 'image',
                    image_url: filteredChapter.logo,
                    alt_text: filteredChapter.chapterdesignation,
                  },
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Host Institution*\n${filteredChapter.dyadinstitutionalid}`,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Manpower*\n${filteredChapter.currentchaptersize}`,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Location*\n${filteredChapter.city}, ${filteredChapter.state}`,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*Website*\n${filteredChapter.website}`,
                    },
                  ],
                },
                {
                  type: 'divider',
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Chapter President*\n${filteredChapter.chapterpresidentname}\n${filteredChapter.chapterpresidentemail}`,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*AVC President*\n${filteredChapter.avcpresidentname}\n${filteredChapter.avcpresidentemail}`,
                    },
                  ],
                },
              ],
              channel: msg.message.room,
              text: fallback,
            };
            robot.logger.debug(JSON.stringify(payload));
            slackWebClient.chat.postMessage(payload);
            return;
          }
          msg.send(fallback);
        } else {
          msg.send(`No chapter matched your search query: ${search}`);
        }
      } catch (parseError) {
        robot.logger.error(parseError);
      }
    });
  });

  // Total manpower count
  robot.respond(/sigep manpower$/i, (msg) => makeAPIRequest('GET', 'wp-admin/admin-ajax.php', {
    action: 'wp_ajax_ninja_tables_public_action',
    table_id: 18473,
    target_action: 'get-all-data',
    default_sorting: 'old_first',
  }, (err, _res, body) => {
    if (err) {
      robot.logger.error(err);
      msg.send(`Error: ${err}`);
      return;
    }

    try {
      const chapters = JSON.parse(body);
      const filteredChapters = chapters.filter((row) => row.chapterdesignation !== '');
      const manpowerCounts = filteredChapters.map((row) => parseInt(row.currentchaptersize, 10));
      const manpower = new Intl.NumberFormat('en-US', {}).format(_.sum(manpowerCounts));
      const manpowerAverage = Math.round(_.sum(manpowerCounts) / manpowerCounts.length);
      msg.send(`There are ${manpower} undergraduates, at an average chapter size of ${manpowerAverage}.`);
    } catch (parseError) {
      robot.logger.error(parseError);
    }
  }));

  // Recent site updates
  robot.respond(/sigep website$/i, (msg) => makeAPIRequest('GET', 'wp-json/wp/v2/pages', {
    orderby: 'modified',
  }, (err, _res, body) => {
    if (err) {
      robot.logger.error(err);
      msg.send(`Error: ${err}`);
      return;
    }

    try {
      const pages = JSON.parse(body);
      const formattedLines = pages.map((row) => `${row.modified} | ${row.link}`);
      const adapterName = robot.adapter?.name ?? robot.adapterName ?? '';
      if (/slack/i.test(adapterName)) {
        msg.send(`\`\`\`\n${formattedLines.join('\n')}\n\`\`\``);
        return;
      }
      msg.send(formattedLines.join('\n'));
    } catch (parseError) {
      robot.logger.error(parseError);
    }
  }));
};
