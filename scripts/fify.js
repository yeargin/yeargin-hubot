// Description
//   Because those GitHubbers keep using the wrong alias
const { TextMessage } = require('hubot');

module.exports = (robot) => robot.hear(/^\.(\w+)(.*)/, (msg) => {
  const payload = new TextMessage(msg.envelope.user, msg.message.text, msg.id);
  payload.text = `${robot.name} ${msg.match[1].trim()} ${msg.match[2].trim()}`.trim();
  robot.logger.debug(payload.text);
  robot.receive(payload, () => robot.logger.debug('Message sent back for processing with correct alias.'));
});
