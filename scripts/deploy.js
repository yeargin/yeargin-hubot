// Description:
//   Deploy the bot with Jenkins
//
// Commands:
//   hubot deploy - Deploys the bot
//   hubot deploy <branch> - Deploys the bot to the specified branch
//
// Configuration:
//   HUBOT_JENKINS_URL - Jenkins URL
//   HUBOT_JENKINS_USER - Jenkins username
//   HUBOT_JENKINS_AUTH_TOKEN - Jenkins auth token
//   HUBOT_JENKINS_JOB - Job ID for Hubot deployment

module.exports = (robot) => {
  const handleError = ({
    err, res, body, msg, threadId,
  }) => {
    robot.logger.error(err || res.statusMessage);
    robot.logger.error(body);
    msg.send({
      attachments: [{
        text: `**Error deploying:** ${err?.message || res.statusMessage}`,
        username: 'jenkins',
        icon_emoji: ':cry:',
        thread_ts: threadId,
        color: 'danger',
      }],
    });
  };

  robot.respond(/(?:bot\s)?deploy\s?(.*)/i, (msg) => {
    const auth = Buffer.from(`${process.env.HUBOT_JENKINS_USER}:${process.env.HUBOT_JENKINS_AUTH_TOKEN}`).toString('base64');
    const headers = {
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    };
    const branch = msg.match[1] || 'main';
    const threadId = msg.message.ts;
    msg.send({
      attachments: [{
        text: `Starting deploy of \`${branch}\` ...`,
        username: 'Jenkins',
        icon_emoji: ':shipit:',
        color: 'blue',
      }],
    });
    robot.http(`${process.env.HUBOT_JENKINS_URL}/job/${process.env.HUBOT_JENKINS_JOB}`)
      .headers(headers)
      .post({
        BRANCH: branch,
      })((err, res, body) => {
        robot.logger.debug(res);
        robot.logger.debug(body);
        if (err || res.statusCode !== 201) {
          handleError({
            err, res, body, msg, threadId,
          });
          return;
        }
        msg.send({
          attachments: [{
            text: `Deploy of \`${branch}\` started. Getting status ...`,
            username: 'Jenkins',
            icon_emoji: ':hourglass:',
            thread_ts: threadId,
            color: 'success',
          }],
        });
        robot.http(`${process.env.HUBOT_JENKINS_URL}/job/${process.env.HUBOT_JENKINS_JOB}/api/json`)
          .headers(headers)
          .get()((err2, res2, body2) => {
            robot.logger.debug(res2);
            robot.logger.debug(body2);
            if (err2 || res2.statusCode !== 200) {
              handleError({
                err2, res2, body2, msg, threadId,
              });
              return;
            }
            const data = JSON.parse(body2);
            msg.send({
              attachments: [{
                title: data.fullDisplayName,
                title_link: data.url,
                text: 'Click the link above to monitor.',
                username: 'Jenkins',
                icon_emoji: ':white_checkmark:',
                thread_ts: threadId,
                color: 'success',
                fields: [
                  {
                    title: 'Status',
                    value: data.result,
                    short: true,
                  },
                ],
              }],
            });
          });
      });
  });
};
