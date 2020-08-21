# Description
#   Sesame Street on PBS Kids
#
# Commands
#   hubot sesame - Show available episodes on PBS Kids

module.exports = (robot) ->
  base_url = 'https://producerplayer.services.pbskids.org/show-list/'

  # Get available episodes
  robot.respond /(?:sesame|sesame street|elmo)(?: episodes)?/i, (msg) ->
    robot.http(base_url).query(
      shows: 'sesame-street',
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
        premier_date = (new Date(episode.encored_on)).toLocaleDateString()
        encore_date = (new Date(episode.premiered_on)).toLocaleDateString()
        runtime = Math.round(episode.duration/60)

        switch robot.adapterName
          when 'slack'
            msg.send {
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
              ]
            }
          else
            msg.send "#{encore_date}: #{episode.title}"
            msg.send "  #{episode.description} (#{runtime} minutes)"
