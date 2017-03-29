# Description
#   Get pollen forecast for Nashville, Tennessee
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot pollen - Gets pollen status for Nashville, Tennessee
#
# Notes:
#   Uses the pollen forecast that powers https://twitter.com/NashvillePollen
#
# Author:
#   stephenyeargin
#   jt2k


api_url = 'https://jasontan.org/api/pollen'

module.exports = (robot) ->

  robot.respond /pollen/i, (msg) ->
    msg.http(api_url)
      .get() (err,res,body) ->
        result = JSON.parse(body)

        try
          if result.error
            msg.send result.error
          else
            msg.send "Nashville pollen level: " + result.count + " (" + result.level + ") - " + result.types

        catch error

          msg.send "Could not retrieve pollen data."
