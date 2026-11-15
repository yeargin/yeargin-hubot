// Description:
//   Retrieve recent bot log entries from journald
//
// Commands:
//   hubot bot logs - Returns the 30 latest bot log entries
//   hubot bot logs <n> - Returns the <n> latest bot log entries
//
// Configuration:
//   HUBOT_LOG_UNIT - systemd unit name (default: hubot)

const { execFile } = require('child_process')
const { WebClient } = require('@slack/web-api')

const MAX_LINES = 1000

module.exports = (robot) => {
  const unit = process.env.HUBOT_LOG_UNIT || 'hubot'

  robot.respond(/bot logs(?:\s+(\d+))?$/i, (msg) => {
    const n = Math.min(Math.max(parseInt(msg.match[1] || '30', 10), 1), MAX_LINES)
    const args = ['-u', unit, '-n', String(n), '--no-pager', '-o', 'short-iso']

    execFile('journalctl', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        robot.logger.error(err)
        msg.send(`Error reading logs: ${(stderr || err.message).trim()}`)
        return
      }

      const output = stdout.trim()
      if (!output) {
        msg.send(`No log entries found for \`${unit}\`.`)
        return
      }

      const adapterName = robot.adapter?.name ?? robot.adapterName ?? ''
      if (!/slack/i.test(adapterName)) {
        msg.send(`\`\`\`\n${output}\n\`\`\``)
        return
      }

      const web = new WebClient(process.env.HUBOT_SLACK_BOT_TOKEN)
      web.filesUploadV2({
        channel_id: msg.message.room,
        thread_ts: msg.message.rawMessage?.ts,
        filename: `${unit}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`,
        content: output,
        initial_comment: `Last ${n} log entries for \`${unit}\``,
      }).catch((slackErr) => {
        robot.logger.error(slackErr)
        msg.send(`\`\`\`\n${output.slice(-3500)}\n\`\`\``)
      })
    })
  })
}
