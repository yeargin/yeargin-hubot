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
const os = require('os');
const { execSync } = require('child_process'); // NEW: for disk usage

dayjs.extend(duration);
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.tz.setDefault('America/Chicago');

module.exports = (robot) => {
  robot.respond(/debug$/i, (msg) => {
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

    const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    const scriptCount = robot.commands ? robot.commands.length : 0;

    const brainConnected = robot.brain?.data ? '✓ Connected' : '✗ Not Connected';
    const brainUsers = robot.brain?.data?.users
      ? Object.keys(robot.brain.data.users).length
      : 0;

    // Host information
    const hostname = os.hostname();
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model ?? 'Unknown';
    const cpuSpeed = cpus[0]?.speed ?? 'Unknown'; // in MHz

    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    const loadAvg = os.loadavg(); // 1, 5, 15-minute loads

    const network = os.networkInterfaces();

    // Environment detection
    const isDocker = process.env.RUNNING_IN_DOCKER === 'true' ||
      (process.env.CONTAINER || '').length > 0 ||
      (process.env.DOCKER_CONTAINER || '').length > 0;
    const environment = isDocker ? 'Docker / Container' : 'Local Host';

    // Optional: Disk usage
    let diskInfo = 'N/A';
    try {
      diskInfo = execSync('df -h --output=source,size,used,avail,pcent / | tail -1')
        .toString()
        .trim();
    } catch (e) {
      // ignore if command not available
    }

    // Build debug info table
    const table = new AsciiTable('Hubot Debug Information');
    table.setHeading('Property', 'Value');

    table.addRow(['Hostname', hostname]);
    table.addRow(['OS Platform', `${os.platform()} ${os.release()}`]);
    table.addRow(['Environment', environment]);
    table.addRow(['Current Time', now.format('YYYY-MM-DD HH:mm:ss z')]);

    // CPU / Load
    table.addRow(['CPUs', `${cpus.length} cores`]);
    table.addRow(['CPU Model', cpuModel]);
    table.addRow(['CPU Speed', `${cpuSpeed} MHz`]);
    table.addRow(['Load Avg (1/5/15)', loadAvg.map(l => l.toFixed(2)).join(' / ')]);

    // Memory
    table.addRow(['Total Memory', formatBytes(totalMem)]);
    table.addRow(['Free Memory', formatBytes(freeMem)]);
    table.addRow(['Process RSS', formatBytes(memUsage.rss)]);
    table.addRow(['Process Heap', formatBytes(memUsage.heapUsed)]);

    // Disk
    table.addRow(['Disk Usage (/)', diskInfo]);

    // Process info
    table.addRow(['Node Version', process.version]);
    table.addRow(['Uptime', uptimeStr]);
    table.addRow(['Process ID', process.pid]);

    // Hubot info
    table.addRow(['Adapter', robot.adapterName || 'Unknown']);
    table.addRow(['Loaded Commands', scriptCount]);
    table.addRow(['Brain Status', brainConnected]);
    table.addRow(['Brain Users', brainUsers]);

    // Network summary (shortened list)
    const networkSummary = Object.entries(network)
      .map(([iface, addrs]) => {
        const ipv4 = addrs.find(a => a.family === 'IPv4' && !a.internal);
        return ipv4 ? `${iface}: ${ipv4.address}` : null;
      })
      .filter(Boolean)
      .join(', ') || 'None';

    table.addRow(['Network Interfaces', networkSummary]);

    // Send formatted output based on adapter
    const adapterName = robot.adapter?.name ?? robot.adapterName ?? '';
    if (/(slack|discord)/i.test(adapterName)) {
      msg.send(`\`\`\`\n${table.toString()}\n\`\`\``);
    } else {
      msg.send(table.toString());
    }
  });
};
