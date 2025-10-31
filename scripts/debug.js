// Description:
//   Debug tooling
//
// Commands:
//   hubot debug - Shows debugging information for running instance.

const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const AsciiTable = require('ascii-table');

dayjs.extend(duration);
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.tz.setDefault('America/Chicago');

module.exports = (robot) => {
  robot.respond(/debug$/i, (msg) => {
    // Gather system information
    const now = dayjs.tz(new Date(), 'America/Chicago');
    const uptimeSeconds = process.uptime();
    const uptimeDuration = dayjs.duration(uptimeSeconds * 1000);
    const memUsage = process.memoryUsage();

    // Format uptime
    const days = Math.floor(uptimeDuration.asDays());
    const hours = uptimeDuration.hours();
    const minutes = uptimeDuration.minutes();
    const uptimeStr = days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;

    // Format memory usage
    const formatBytes = (bytes) => {
      const mb = (bytes / 1024 / 1024).toFixed(2);
      return `${mb} MB`;
    };

    // Count loaded scripts
    const scriptCount = robot.commands ? robot.commands.length : 0;

    // Check brain status
    const brainConnected = robot.brain?.data ? '✓ Connected' : '✗ Not Connected';
    const brainUsers = robot.brain?.data?.users
      ? Object.keys(robot.brain.data.users).length
      : 0;

    // Environment detection
    const isDocker = process.env.RUNNING_IN_DOCKER === 'true';
    const environment = isDocker ? 'Docker' : 'Local';

    // Build debug info table
    const table = new AsciiTable('Hubot Debug Information');
    table.setHeading('Property', 'Value');
    table.addRow(['Current Time', now.format('YYYY-MM-DD HH:mm:ss z')]);
    table.addRow(['Adapter', robot.adapterName || 'Unknown']);
    table.addRow(['Environment', environment]);
    table.addRow(['Node Version', process.version]);
    table.addRow(['Uptime', uptimeStr]);
    table.addRow(['Memory (RSS)', formatBytes(memUsage.rss)]);
    table.addRow(['Memory (Heap)', formatBytes(memUsage.heapUsed)]);
    table.addRow(['Process ID', process.pid]);
    table.addRow(['Loaded Commands', scriptCount]);
    table.addRow(['Brain Status', brainConnected]);
    table.addRow(['Brain Users', brainUsers]);

    // Send formatted output based on adapter
    if (/(slack|discord)/i.test(robot.adapterName)) {
      msg.send(`\`\`\`\n${table.toString()}\n\`\`\``);
    } else {
      msg.send(table.toString());
    }
  });
}
