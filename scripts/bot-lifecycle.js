// Description:
//   Bot lifecycle: startup announcement, restart, and Jenkins deploys
//
// Commands:
//   hubot bot restart - Restarts the bot (relies on systemd Restart= to bring it back)
//   hubot deploy - Deploys the bot
//   hubot deploy <branch> - Deploys the bot to the specified branch
//
// Configuration:
//   HUBOT_JENKINS_URL - Jenkins URL
//   HUBOT_JENKINS_USER - Jenkins username
//   HUBOT_JENKINS_AUTH_TOKEN - Jenkins auth token
//   HUBOT_JENKINS_JOB - Job ID for Hubot deployment

const { execFileSync } = require('child_process')
const os = require('os')
const { setTimeout: sleep } = require('timers/promises')
const { version: hubotVersion } = require('hubot/package.json')

const STARTUP_ROOM_SLACK = '#hubots'
const STARTUP_ROOM_DEFAULT = 'Shell'
const BRAIN_KEY = 'pendingDeploy'
const QUEUE_POLL_MS = 5000
const QUEUE_TIMEOUT_MS = 5 * 60 * 1000
const BUILD_POLL_MS = 10000
const BUILD_TIMEOUT_MS = 30 * 60 * 1000
const JENKINS_ENVS = ['HUBOT_JENKINS_URL', 'HUBOT_JENKINS_USER', 'HUBOT_JENKINS_AUTH_TOKEN', 'HUBOT_JENKINS_JOB']

const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

const formatDuration = (ms) => {
  const seconds = Math.round(ms / 1000)
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`
}

module.exports = (robot) => {
  const adapterName = robot.adapter?.name ?? robot.adapterName ?? ''
  const isSlack = /slack/i.test(adapterName)

  const send = ({ room, threadId }, text, { color, title, titleLink } = {}) => {
    if (isSlack) {
      const attachment = { text, mrkdwn_in: ['text'] }
      if (color) attachment.color = color
      if (title) attachment.title = title
      if (titleLink) attachment.title_link = titleLink
      robot.messageRoom(room, { attachments: [attachment], thread_ts: threadId })
      return
    }
    const heading = [title, titleLink].filter(Boolean).join(' - ')
    robot.messageRoom(room, heading ? `${heading}\n${text}` : text)
  }

  const context = (msg) => {
    const raw = msg.message.rawMessage
    return { room: msg.message.room, threadId: isSlack ? (raw?.thread_ts ?? raw?.ts) : undefined }
  }

  // Commands relayed by another script (e.g. hubot-ollama) arrive without the adapter's raw message.
  const isRelayed = (msg) => isSlack && !msg.message.rawMessage

  // Startup

  const displayName = async () => {
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

  robot.on('scripts have loaded', async () => {
    const rows = [
      ['Host', os.hostname()],
      ['Branch', git('rev-parse', '--abbrev-ref', 'HEAD')],
      ['Commit', git('rev-parse', '--short', 'HEAD')],
      ['Hubot', hubotVersion],
      ['Node', process.version],
    ]

    if (!isSlack) {
      const headline = `${robot.name} has started!`
      robot.messageRoom(STARTUP_ROOM_DEFAULT, [headline, ...rows.map(([k, v]) => `${k}: ${v}`)].join(' | '))
      return
    }

    const name = await displayName()
    robot.messageRoom(STARTUP_ROOM_SLACK, {
      text: `${name} has started!`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*${name}* has started!` } },
        { type: 'table', rows: rows.map((row) => row.map((text) => ({ type: 'raw_text', text }))) },
      ],
    })
  })

  // Restart

  robot.respond(/bot restart$/i, async (msg) => {
    if (isRelayed(msg)) {
      msg.send('Restarts must be requested directly, not through another command.')
      return
    }
    robot.logger.info(`Restart requested by ${msg.message.user.name}`)
    await msg.send('Restarting ...')
    robot.shutdown()
    process.exit(1)
  })

  // Deploy

  const jenkins = (method, url) => new Promise((resolve, reject) => {
    const auth = Buffer.from(`${process.env.HUBOT_JENKINS_USER}:${process.env.HUBOT_JENKINS_AUTH_TOKEN}`).toString('base64')
    const req = robot.http(url)
      .headers({ Accept: 'application/json', Authorization: `Basic ${auth}` })
      .timeout(15000)
    const handler = (err, res, body) => (err ? reject(err) : resolve({ res, body }))
    if (method === 'POST') req.post()(handler)
    else req.get()(handler)
  })

  const jenkinsJson = async (url) => {
    const { res, body } = await jenkins('GET', `${url.replace(/\/?$/, '/')}api/json`)
    if (res.statusCode !== 200) throw new Error(`GET ${url} returned ${res.statusCode}`)
    return JSON.parse(body)
  }

  const poll = async (url, intervalMs, timeoutMs, check) => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const result = check(await jenkinsJson(url))
      if (result) return result
      await sleep(intervalMs)
    }
    return null
  }

  const waitForBuildUrl = async (queueUrl) => {
    const url = await poll(queueUrl, QUEUE_POLL_MS, QUEUE_TIMEOUT_MS, (item) => {
      if (item.cancelled) throw new Error('Build was cancelled while queued')
      return item.executable?.url
    })
    if (!url) throw new Error('Timed out waiting for the build to leave the queue')
    return url
  }

  let tracking = false
  const reportResult = async (pending) => {
    tracking = true
    try {
      const build = await poll(pending.buildUrl, BUILD_POLL_MS, BUILD_TIMEOUT_MS, (b) => (!b.building && b.result ? b : null))
      if (!build) throw new Error('Timed out waiting for the build to finish')
      send(pending, `Deploy of \`${pending.branch}\` finished: *${build.result}* in ${formatDuration(build.duration)}`, {
        color: build.result === 'SUCCESS' ? 'good' : 'danger',
        title: build.fullDisplayName,
        titleLink: build.url,
      })
    } catch (err) {
      robot.logger.error(err)
      send(pending, `Lost track of deploy of \`${pending.branch}\`: ${err.message}`, {
        color: 'danger',
        title: 'Build',
        titleLink: pending.buildUrl,
      })
    } finally {
      robot.brain.remove(BRAIN_KEY)
      robot.brain.save()
      tracking = false
    }
  }

  // A deploy usually restarts the bot mid-build, so pick the pending deploy back up once the brain loads.
  // 'loaded' also fires on every brain.set(), so guard on whether we're already tracking one.
  robot.brain.on('loaded', () => {
    const pending = robot.brain.get(BRAIN_KEY)
    if (pending && !tracking) reportResult(pending)
  })

  robot.respond(/(?:bot\s+)?deploy(?:\s+([\w./-]+))?$/i, async (msg) => {
    const ctx = context(msg)

    if (isRelayed(msg)) {
      send(ctx, 'Deploys must be requested directly, not through another command.', { color: 'danger' })
      return
    }

    const missing = JENKINS_ENVS.filter((k) => !process.env[k])
    if (missing.length) {
      send(ctx, `Missing required configuration: ${missing.join(', ')}`, { color: 'danger' })
      return
    }

    const branch = msg.match[1] || 'main'
    robot.logger.info(`Deploy of ${branch} requested by ${msg.message.user.name}`)
    send(ctx, `Starting deploy of \`${branch}\` ...`, { color: '#439FE0' })

    try {
      const jobUrl = `${process.env.HUBOT_JENKINS_URL}/job/${process.env.HUBOT_JENKINS_JOB}`
      const { res } = await jenkins('POST', `${jobUrl}/buildWithParameters?BRANCH=${encodeURIComponent(branch)}`)
      if (res.statusCode !== 201 || !res.headers.location) {
        throw new Error(`Jenkins returned ${res.statusCode} ${res.statusMessage || ''}`.trim())
      }

      const buildUrl = await waitForBuildUrl(res.headers.location)
      send(ctx, 'Will report back here when it finishes.', { color: 'good', title: 'Build started', titleLink: buildUrl })

      const pending = { ...ctx, branch, buildUrl }
      tracking = true
      robot.brain.set(BRAIN_KEY, pending)
      robot.brain.save()
      await reportResult(pending)
    } catch (err) {
      robot.logger.error(err)
      send(ctx, `Error deploying: ${err.message}`, { color: 'danger' })
    }
  })
}
