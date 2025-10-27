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
  const isSlack = /slack/.test(robot.adapterName)

  const sendMsg = (msg, text, {
    color, title, title_link: titleLink, threadId,
  } = {}) => {
    if (isSlack) {
      const attachment = {
        text,
        mrkdwn_in: ['text'],
      }
      if (color) attachment.color = color
      if (title) attachment.title = title
      if (titleLink) attachment.title_link = titleLink
      msg.send({ attachments: [attachment], thread_ts: threadId })
    } else {
      let line = ''
      if (title && titleLink) line += `${title} - ${titleLink}\n`
      else if (title) line += `${title}\n`
      line += text
      msg.send(line)
    }
  }

  const requiredEnvs = ['HUBOT_JENKINS_URL', 'HUBOT_JENKINS_USER', 'HUBOT_JENKINS_AUTH_TOKEN', 'HUBOT_JENKINS_JOB']

  const checkConfig = (msg, threadId) => {
    const missing = requiredEnvs.filter((k) => !process.env[k])
    if (missing.length) {
      sendMsg(msg, `Missing required configuration: ${missing.join(', ')}`, { color: 'danger', threadId })
      return false
    }
    return true
  }

  const handleError = ({
    err, res, body, msg, threadId,
  }) => {
    robot.logger.error(err || res.statusMessage);
    robot.logger.error(body);
    sendMsg(msg, `Error deploying: ${err?.message || res?.statusMessage || 'Unknown error'}`, { color: 'danger', threadId })
  };

  robot.respond(/(?:bot\s)?deploy\s?(.*)/i, (msg) => {
    const threadId = isSlack ? msg.message.rawMessage?.ts : undefined;
    if (!checkConfig(msg, threadId)) return

    const auth = Buffer.from(`${process.env.HUBOT_JENKINS_USER}:${process.env.HUBOT_JENKINS_AUTH_TOKEN}`).toString('base64');
    const headers = {
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    };
    const branchRaw = (msg.match[1] || '').trim()
    const branch = branchRaw || 'main'
    if (!/^[\w./-]+$/.test(branch)) {
      sendMsg(msg, `Invalid branch name: \`${branch}\``, { color: 'danger', threadId })
      return
    }
    robot.logger.debug({ branch, threadId });
    sendMsg(msg, `Starting deploy of \`${branch}\` ...`, { color: '#439FE0', threadId })
    robot.http(`${process.env.HUBOT_JENKINS_URL}/job/${encodeURIComponent(process.env.HUBOT_JENKINS_JOB)}/buildWithParameters`)
      .headers(headers)
      .timeout(15000)
      .post({
        BRANCH: branch,
      })((err, res, body) => {
        robot.logger.debug({ statusCode: res && res.statusCode, headers: res && res.headers })
        robot.logger.debug({ bodyLength: body && body.length })
        if (err || res.statusCode !== 201) {
          handleError({
            err, res, body, msg, threadId,
          });
          return;
        }
        sendMsg(msg, 'Deploy added to queue. Getting status ...', { color: 'good', threadId })
        robot.http(`${process.env.HUBOT_JENKINS_URL}/job/${encodeURIComponent(process.env.HUBOT_JENKINS_JOB)}/api/json`)
          .headers(headers)
          .timeout(15000)
          .get()((err2, res2, body2) => {
            robot.logger.debug({ statusCode: res2 && res2.statusCode, headers: res2 && res2.headers })
            robot.logger.debug({ bodyLength: body2 && body2.length })
            if (err2 || res2.statusCode !== 200) {
              handleError({
                err: err2, res: res2, body: body2, msg, threadId,
              });
              return;
            }
            let data
            try {
              data = JSON.parse(body2)
            } catch (parseErr) {
              handleError({ err: parseErr, res: res2, body: body2, msg, threadId })
              return
            }
            sendMsg(msg, 'Click the link above to monitor.', {
              color: 'good',
              title: data.fullDisplayName,
              title_link: data.url,
              threadId,
            })
          });
      });
  });
};
