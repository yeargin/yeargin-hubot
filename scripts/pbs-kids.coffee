# Description
#   PBS Kids Programming
#
# Configuration
#   HUBOT_PBS_SHOWS - Comma separated list of show IDs.
#
# Commands
#   hubot pbs - Show configured shows available on the PBS Kids app
#   hubot sesame - Show available Sesame Street episodes on PBS Kids app

module.exports = (robot) ->
  configured_shows = process.env.HUBOT_PBS_SHOWS or 'sesame-street,daniel-tigers-neighborhood'
  base_url = 'https://producerplayer.services.pbskids.org/show-list/'

  robot.respond /(pbs|pbs kids)$/i, (msg) ->
    displayShowData(configured_shows, msg)

  # Shortcut to Sesame Street
  robot.respond /(?:sesame|sesame street|elmo)(?: episodes)?/i, (msg) ->
    displayShowData('sesame-street', msg)

  displayShowData = (shows, msg) ->
    robot.http(base_url).query(
      shows: shows,
      available: 'public',
      sort: '-encored_on',
      type: 'episode'
    ).get() (err, res, body) ->
      try
        episodes = JSON.parse(body)
      catch err
        robot.logger.error err
        return
      for episode in episodes.items
        premier_date = (new Date(episode.premiered_on)).toLocaleDateString()
        encore_date = (new Date(episode.encored_on)).toLocaleDateString()
        runtime = Math.round(episode.duration/60)

        switch robot.adapterName
          when 'slack'
            { WebClient } = require '@slack/web-api'
            slackWebClient = new WebClient(process.env.HUBOT_SLACK_TOKEN)
            payload = {
              "as_user": false,
              "username": "PBS Kids",
              "icon_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/PBS_Kids_logo_%282022%29.svg/240px-PBS_Kids_logo_%282022%29.svg.png",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": episode.title
                  }
                },
                {
                  "type": "image",
                  "image_url": "#{episode.images['kids-mezzannine-16x9'].url}",
                  "alt_text": episode.title
                },
                {
                  "type": "section",
                  "fields": [
                    {
                      "type": "mrkdwn",
                      "text": "*Episode:* #{episode.nola_episode}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Encore Date:* #{encore_date}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Premier Date:* #{premier_date}"
                    },
                    {
                      "type": "mrkdwn",
                      "text": "*Runtime:* #{runtime} minutes"
                    }
                  ]
                },
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": episode.description
                  }
                }
              ],
              "channel": msg.message.room
            }
            slackWebClient.chat.postMessage(payload)
          else
            msg.send "#{encore_date}: #{episode.title}"
            msg.send "  #{episode.description} (#{runtime} minutes)"
