// Description:
//   MNPD Active Dispatches
//
// Commands:
//   hubot mnpd - Get all active dispatches
//   hubot mnpd <area> - Filter active dispatches list to a fuzzy matched area, e.g. East
//

const dayjs = require('dayjs');
const AsciiTable = require('ascii-table');
const { WebClient } = require('@slack/web-api');
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

  const tableTitle = '👮 MNPD Active Dispatches 🚔';
  const tableHeading = ['Time', 'Code', 'Type', 'Location', 'City'];

  const buildRows = (data) => data.features
    .sort(
      (a, b) =>
        b.attributes.CallReceivedTime -
        a.attributes.CallReceivedTime
    )
    .map(({ attributes }) => [
      dayjs
        .tz(attributes.CallReceivedTime, 'America/Chicago')
        .fromNow(),
      attributes.IncidentTypeCode,
      attributes.IncidentTypeName,
      attributes.Location,
      attributes.CityName,
    ]);

  const formatTable = (rows) => {
    const table = new AsciiTable(tableTitle);
    table.setHeading(...tableHeading);
    rows.forEach((row) => table.addRow(row));
    return table.toString();
  };

  const formatSlackBlocks = (rows) => ({
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: tableTitle, emoji: true },
      },
      {
        type: 'table',
        rows: [tableHeading, ...rows.slice(0, 99)].map((row) => row.map((cell) => ({
          type: 'raw_text',
          text: String(cell ?? ''),
        }))),
      },
    ],
  });

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

        const rows = buildRows(data);
        const output = formatTable(rows);

        const adapterName = robot.adapterName ?? robot.adapter?.name;
        if (/slack/i.test(adapterName)) {
          const web = new WebClient(process.env.HUBOT_SLACK_BOT_TOKEN);
          web.chat.postMessage({
            channel: msg.message.room,
            text: output,
            ...formatSlackBlocks(rows),
          }).catch((slackErr) => {
            robot.logger.error(slackErr);
            msg.send('Error posting MNPD table to Slack.');
          });
          return;
        }

        msg.send(output);
      });
  });
};
