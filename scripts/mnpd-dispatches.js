// Description
//   MNPD Active Dispatches
//
// Commands
//   hubot police - Show all active dispatches
//   hubot police <city name> - Filter incidents to a city name

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
  const baseUrl = 'https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Metro_Nashville_Police_Department_Active_Dispatch_Table_view/FeatureServer/0/query?f=json&cacheHint=true&resultOffset=0&resultRecordCount=50&where=1%3D1&orderByFields=LastUpdated%20ASC%2CObjectId%20ASC&outFields=*&returnGeometry=false&spatialRel=esriSpatialRelIntersects';

  const formatTable = (data) => {
    const table = new AsciiTable('👮 MNPD Active Dispatches 🚔');
    table.setHeading('Time', 'Code', 'Type', 'Location', 'City');

    const sortedData = data.features.sort(
      (a, b) =>
        b.attributes.CallReceivedTime -
        a.attributes.CallReceivedTime,
    );

    sortedData.forEach((row) => {
      const { attributes } = row;

      table.addRow([
        dayjs
          .tz(attributes.CallReceivedTime, 'America/Chicago')
          .fromNow(),
        attributes.IncidentTypeCode,
        attributes.IncidentTypeName,
        attributes.Location,
        attributes.CityName,
      ]);
    });

    return table.toString();
  };

  return robot.respond(/(?:mnpd|👮|police|:cop:)\s?(\d{5})?/i, (msg) => {
    const cityName = msg.match[1];
    const query = {
      where: '1=1',
      outFields: '*',
      outSR: 4326,
      f: 'json',
    };
    if (cityName) {
      query.where = `CityName=${cityName}`;
    }

    return robot.http(baseUrl)
      .query(query)
      .get()((err, res, body) => {
        const data = JSON.parse(body);
        if (data.features?.length === 0) {
          msg.send('No active incidents.');
          return;
        }

        const adapterName = robot.adapterName ?? robot.adapter?.name;
        if (/slack/.test(adapterName)) {
          msg.send(`\`\`\`\n${formatTable(data, msg)}\n\`\`\``);
          return;
        }
        msg.send(formatTable(data, msg));
      });
  });
};
