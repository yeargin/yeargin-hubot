// Description:
//   Restart the bot process (relies on systemd Restart= to bring it back)
//
// Commands:
//   hubot bot restart - Restarts the bot

module.exports = (robot) => {
  robot.respond(/bot restart$/i, async (msg) => {
    robot.logger.info(`Restart requested by ${msg.message.user.name}`)
    await msg.send('Restarting ...')
    robot.shutdown()
    process.exit(1)
  })
}
