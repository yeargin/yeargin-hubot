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

module.exports = (robot) => {
  robot.on('scripts have loaded', () => {
    const adapterName = robot.adapter?.name ?? robot.adapterName ?? ''
    const rows = [
      ['Host', os.hostname()],
      ['Branch', git('rev-parse', '--abbrev-ref', 'HEAD')],
      ['Commit', git('rev-parse', '--short', 'HEAD')],
      ['Hubot', hubotVersion],
      ['Node', process.version],
    ]
    const headline = `${robot.name} has started!`

    if (!/slack/i.test(adapterName)) {
      robot.messageRoom('Shell', [headline, ...rows.map(([k, v]) => `${k}: ${v}`)].join(' | '))
      return
    }

    robot.messageRoom('#hubots', {
      text: headline,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*${robot.name}* has started!` } },
        {
          type: 'table',
          rows: rows.map((row) => row.map((text) => ({ type: 'raw_text', text }))),
        },
      ],
    })
  })
}
