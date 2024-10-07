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
  const baseUrl = 'https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Nashville_Fire_Department_Active_Incidents_view/FeatureServer/0/query?where=1%3D1&objectIds=&time=&resultType=none&outFields=*&returnIdsOnly=false&returnUniqueIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&cacheHint=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&having=&resultOffset=&resultRecordCount=&sqlFormat=none&f=pjson&token=';

  const formatTable = (data) => {
    const table = new AsciiTable('Nashville Fire Active Incidents');
    table.setHeading('Time', 'Postal Code', 'Type', 'Unit Dispatched');
    const sortedData = data.features.sort(
      (a, b) => b.attributes.DispatchDateTime - a.attributes.DispatchDateTime,
    );
    sortedData.forEach((row) => {
      const { attributes } = row;
      table.addRow([
        dayjs.tz(attributes.DispatchDateTime, 'America/Chicago').fromNow(),
        attributes.PostalCode,
        attributes.incident_type_id,
        attributes.Unit_ID,
      ]);
    });
    return table.toString();
  };

  return robot.respond(/(?:nfd|🔥|fire|:fire:)\s?(\d{5})?/i, (msg) => {
    const zip = msg.match[1];
    const query = {
      where: '1=1',
      outFields: '*',
      outSR: 4326,
      f: 'json',
    };
    if (zip) {
      query.where = `PostalCode=${zip}`;
    }

    return robot.http(baseUrl)
      .query(query)
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
