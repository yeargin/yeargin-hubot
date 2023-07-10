# Description
#   Nashville Fire Department Incidents
#
# Commands
#   hubot fire - Show all active incidents
#   hubot fire <zip code> - Filter incidents to a zip code
dayjs = require('dayjs')
AsciiTable = require('ascii-table')

module.exports = (robot) ->
  # Configure dayjs
  relativeTime = require('dayjs/plugin/relativeTime')
  timezone = require('dayjs/plugin/timezone')
  utc = require('dayjs/plugin/utc')
  dayjs.extend(relativeTime)
  dayjs.extend(timezone)
  dayjs.extend(utc)
  dayjs.tz.setDefault('America/Chicago')

  baseUrl = 'https://data.nashville.gov/api/id/jwgg-8gg4.json'

  formatTable = (data) ->
    table = new AsciiTable('Nashville Fire Active Incidents')
    table.setHeading 'Time', 'Postal Code', 'Type', 'Unit Dispatched'
    for row in data
      table.addRow [dayjs.tz(row.dispatch_time, 'America/Chicago').fromNow(), row.postal_code, row.incident_type, row.units_dispatched]
    table.toString()

  robot.respond /(?:nfd|🔥|fire|:fire:)\s?(\d{5})?/i, (msg) ->
    zip = msg.match[1]
    query = "select *, :id order by `dispatch_time` desc limit 200"
    if zip
      query = "select *, :id where (`postal_code` = 37206) order by `dispatch_time` desc limit 200"
      
    robot.http(baseUrl)
        .query(
          '$query': query 
        )
        .get() (err, res, body) ->
          data = JSON.parse(body)
          if data.length == 0
            msg.send "No active incidents."
            return

          if robot.adapterName == 'slack'
            msg.send "```\n#{formatTable(data, msg)}\n```"
          else
            msg.send formatTable(data, msg)
