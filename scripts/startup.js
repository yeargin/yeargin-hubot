// Description:
//   Announce bot startup with host and build information

const { execFileSync } = require('child_process')
const os = require('os')
const { version: hubotVersion } = require('hubot/package.json')

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

const displayName = async (robot) => {
  const userId = robot.adapter?.self?.user_id
  if (!userId) return robot.name
  try {
    const { user } = await robot.adapter.client.web.users.info({ user: userId })
    return user.profile?.display_name || user.real_name || robot.name
  } catch (err) {
    robot.logger.error(err)
    return robot.name
  }
}

module.exports = (robot) => {
  robot.on('scripts have loaded', async () => {
    const adapterName = robot.adapter?.name ?? robot.adapterName ?? ''
    const rows = [
      ['Host', os.hostname()],
      ['Branch', git('rev-parse', '--abbrev-ref', 'HEAD')],
      ['Commit', git('rev-parse', '--short', 'HEAD')],
      ['Hubot', hubotVersion],
      ['Node', process.version],
    ]

    if (!/slack/i.test(adapterName)) {
      const headline = `${robot.name} has started!`
      robot.messageRoom('Shell', [headline, ...rows.map(([k, v]) => `${k}: ${v}`)].join(' | '))
      return
    }

    const name = await displayName(robot)
    robot.messageRoom('#hubots', {
      text: `${name} has started!`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*${name}* has started!` } },
        {
          type: 'table',
          rows: rows.map((row) => row.map((text) => ({ type: 'raw_text', text }))),
        },
      ],
    })
  })
}
