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
  robot.respond(/deploy\s?(.*)/i, (msg) => {
    msg.send('Initiating deployment ...');
    const auth = Buffer.from(`${process.env.HUBOT_JENKINS_USER}:${process.env.HUBOT_JENKINS_AUTH_TOKEN}`).toString('base64');
    robot.http(`${process.env.HUBOT_JENKINS_URL}/job/${process.env.HUBOT_JENKINS_JOB}/buildWithParameters`)
      .headers({
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      })
      .post({
        BRANCH: msg.match[1] || 'main',
      })((err, res, body) => {
        robot.logger.debug(res);
        robot.logger.debug(body);
        if (err) {
          robot.logger.error(err);
          msg.send(err.message);
          return;
        }
        msg.send('Deployment initiated.');
      });
  });
};
