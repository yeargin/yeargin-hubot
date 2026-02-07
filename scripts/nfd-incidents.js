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
  const baseUrl = 'https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Nashville_Fire_Department_Active_Incidents_view/FeatureServer/0/query';

  const formatTable = (data) => {
    const table = new AsciiTable('🔥 Nashville Fire Active Incidents 🚒');
    table.setHeading('Time', 'Postal Code', 'Type', 'Units Dispatched');

    const events = {};

    data.features.forEach((row) => {
      const { attributes } = row;
      const eventId = attributes.event_number;

      if (!events[eventId]) {
        events[eventId] = {
          DispatchDateTime: attributes.DispatchDateTime,
          PostalCode: attributes.PostalCode,
          incident_type_id: attributes.incident_type_id,
          units: new Set(),
        };
      }

      if (attributes.Unit_ID) {
        events[eventId].units.add(attributes.Unit_ID);
      }
    });

    const sortedEvents = Object.values(events).sort(
      (a, b) => b.DispatchDateTime - a.DispatchDateTime,
    );

    sortedEvents.forEach((event) => {
      const units = Array.from(event.units).sort();
      const visibleUnits = units.slice(0, 5);
      const remaining = units.length - visibleUnits.length;

      table.addRow([
        dayjs
          .tz(event.DispatchDateTime, 'America/Chicago')
          .fromNow(),
        event.PostalCode,
        event.incident_type_id,
        remaining > 0
          ? `${visibleUnits.join(', ')} + ${remaining} more`
          : visibleUnits.join(', '),
      ]);
    });

    return table.toString();
  };

  return robot.respond(/(?:nfd|🔥|fire|:fire:)\s?(\d{5})?/i, (msg) => {
    const zip = msg.match[1];
    const query = {
      where: '1=1',
      outFields: '*',
      returnGeometry: false,
      f: 'pjson',
    };

    if (zip) {
      query.where = `PostalCode='${zip}'`;
    }

    return robot.http(baseUrl)
      .query(query)
      .get()((err, res, body) => {
        if (err || res.statusCode !== 200) {
          robot.logger.error({ err, body });
          msg.send('Error fetching NFD active incidents');
        }

        const data = JSON.parse(body);
        if (data.features?.length === 0) {
          msg.send('No active incidents.');
          return;
        }

        const output = formatTable(data);

        const adapterName = robot.adapter?.name ?? robot.adapterName ?? '';
        if (/slack/i.test(adapterName)) {
          msg.send(`\`\`\`\n${output}\n\`\`\``);
          return;
        }

        msg.send(output);
      });
  });
};
