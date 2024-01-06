// Description
//   Nashville Fire Department Incidents
//
// Commands
//   hubot fire - Show all active incidents
//   hubot fire <zip code> - Filter incidents to a zip code

const dayjs = require('dayjs');
const AsciiTable = require('ascii-table');
const relativeTime = require('dayjs/plugin/relativeTime');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.tz.setDefault('America/Chicago');

module.exports = (robot) => {
  // Configure dayjs
  const baseUrl = 'https://data.nashville.gov/api/id/jwgg-8gg4.json';

  const formatTable = (data) => {
    const table = new AsciiTable('Nashville Fire Active Incidents');
    table.setHeading('Time', 'Postal Code', 'Type', 'Unit Dispatched');
    data.forEach((row) => {
      table.addRow([dayjs.tz(row.dispatch_time, 'America/Chicago').fromNow(), row.postal_code, row.incident_type, row.units_dispatched]);
    });
    return table.toString();
  };

  return robot.respond(/(?:nfd|🔥|fire|:fire:)\s?(\d{5})?/i, (msg) => {
    const zip = msg.match[1];
    let query = 'select *, :id order by `dispatch_time` desc limit 200';
    if (zip) {
      query = 'select *, :id where (`postal_code` = 37206) order by `dispatch_time` desc limit 200';
    }

    return robot.http(baseUrl)
      .query({
        $query: query,
      })
      .get()((err, res, body) => {
        const data = JSON.parse(body);
        if (data.length === 0) {
          msg.send('No active incidents.');
          return;
        }

        if (/slack/.test(robot.adapterName)) {
          msg.send(`\`\`\`\n${formatTable(data, msg)}\n\`\`\``);
          return;
        }
        msg.send(formatTable(data, msg));
      });
  });
};
