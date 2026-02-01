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
  const baseUrl =
    'https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Metro_Nashville_Police_Department_Active_Dispatch_Table_view/FeatureServer/0/query';

  const formatTable = (data) => {
    const table = new AsciiTable('👮 MNPD Active Dispatches 🚔');
    table.setHeading('Time', 'Code', 'Type', 'Location', 'City');

    data.features
      .sort(
        (a, b) =>
          b.attributes.CallReceivedTime -
          a.attributes.CallReceivedTime
      )
      .forEach(({ attributes }) => {
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

  robot.respond(/(?:mnpd|👮|police|:cop:)\s*(.*)?/i, (msg) => {
    const cityName = msg.match[1]?.trim();

    const query = {
      f: 'json',
      where: '1=1',
      outFields: '*',
      returnGeometry: false,
      orderByFields: 'LastUpdated ASC,ObjectId ASC',
      resultRecordCount: 50,
      cacheHint: true,
    };

    if (cityName) {
      const formattedCityName = cityName.replace(/'/g, "''");
      query.where = `CityName='${formattedCityName}'`;
    }

    robot.http(baseUrl)
      .query(query)
      .get()((err, res, body) => {
        if (err || res.statusCode !== 200) {
          robot.logger.error({ err, body });
          msg.send('Error fetching MNPD data.');
          return;
        }

        const data = JSON.parse(body);

        if (!data.features?.length) {
          msg.send('No active incidents.');
          return;
        }

        const output = formatTable(data);

        const adapterName = robot.adapterName ?? robot.adapter?.name;
        if (/slack/i.test(adapterName)) {
          msg.send(`\`\`\`\n${output}\n\`\`\``);
          return;
        }

        msg.send(output);
      });
  });
};
