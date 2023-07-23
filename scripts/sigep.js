// Description:
//   Interacts with the SigEp website
//
// Commands:
//   hubot sigep chapters - Gets chapter count
//   hubot sigep manpower - Gets total manpower
//   hubot sigep website - List most recently updated pages
//

// eslint-disable-next-line import/no-extraneous-dependencies
const _ = require('lodash');

module.exports = (robot) => {
  // Example: Centralized request handler
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
      if (robot.adapterName === 'slack') {
        msg.send(`\`\`\`\n${formattedLines.join('\n')}\n\`\`\``);
        return;
      }
      msg.send(formattedLines.join('\n'));
    } catch (parseError) {
      robot.logger.error(parseError);
    }
  }));
};
