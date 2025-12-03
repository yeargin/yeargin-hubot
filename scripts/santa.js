// Description:
//   Adds a Santa hat to a user's avatar or a provided image URL.
//   Works on Slack if available, otherwise requires a URL.
//
// Commands:
//   hubot santa me - Adds a Santa hat to your avatar (Slack only).
//   hubot santa <image url> - Adds a Santa hat to the provided image.
//
// Category: social
//
// Author:
//   dgoodlad

const {
  WebClient
} = require('@slack/web-api');
const santaAPIURL = "https://santa-me-production.up.railway.app/santa-hatify";

// Cooldown in milliseconds to prevent spam
const COOLDOWN_MS = 5000;

module.exports = (robot) => {
  robot.respond(/santa\s+(?:me\s+)?(.+)/i, async (res) => {
    const now = Date.now();
    const userId = res.message.user.id;
    const lastUsed = robot.brain.get(`santa:${userId}`) || 0;

    if(now - lastUsed < COOLDOWN_MS) {
      return res.reply("Slow down! 🎅 Wait a few seconds before trying again.");
    }
    robot.brain.set(`santa:${userId}`, now);

    const arg = res.match[1].trim(); // URL or "me" alone
    let imageURL;

    const isSlack =
      (robot.adapterName || robot.adapter?.name || "").toLowerCase().includes("slack");

    // Case 1: user typed only "me"
    if(arg.toLowerCase() === "me") {
      if(!isSlack) {
        return res.reply(
          "Fetching your avatar only works on Slack. Please provide a URL instead: `santa <image url>`"
        );
      }

      try {
        const slackToken = process.env.HUBOT_SLACK_TOKEN;
        if(!slackToken) {
          return res.reply(
            "Slack token not configured. Please set HUBOT_SLACK_TOKEN."
          );
        }

        const web = new WebClient(slackToken);
        const slackUserId = userId;

        const user = await web.users.info({
          user: slackUserId
        });
        const profile = user.user.profile;

        imageURL = profile.image_512 || profile.image_192 || null;
        if(!imageURL) {
          return res.reply("Could not find your avatar image.");
        }
      } catch (err) {
        robot.logger.error(err);
        return res.reply(`Failed to get Slack user info: ${err}`);
      }
    } else {
      // Case 2: URL provided (optional "me" ignored)
      imageURL = arg.replace(/^<|>$/g, "").replace(/[.,;!?]$/, ""); // clean URL

      // Validate URL and image extension
      try {
        const parsed = new URL(imageURL);
        if(!["http:", "https:"].includes(parsed.protocol)) {
          return res.reply("URL must start with http:// or https://");
        }
        if(!/\.(jpg|jpeg|png|gif)$/i.test(imageURL)) {
          return res.reply("Please provide a valid image URL (jpg, jpeg, png, gif).");
        }
      } catch (err) {
        return res.reply(`Invalid URL: ${err}`);
      }
    }

    // Build santa-hatify URL
    const santaImageURL = `${santaAPIURL}?url=${encodeURIComponent(imageURL)}`;

    // Slack image blocks
    const blocks = [{
      type: "image",
      image_url: santaImageURL,
      alt_text: "Ho ho ho! 🎅",
    }, ];

    const text = `Ho ho ho! 🎅 <@${userId}>`;

    // Send message
    try {
      if(isSlack) {
        const slackToken = process.env.HUBOT_SLACK_TOKEN;
        const web = new WebClient(slackToken);

        const threadTS =
          res.message.rawMessage?.thread_ts || res.message.rawMessage?.ts || null;

        const msgParams = {
          channel: res.message.room,
          text,
          blocks,
          ...(threadTS ? {
            thread_ts: threadTS
          } : {}),
        };

        await web.chat.postMessage(msgParams);
      } else {
        // Generic adapter fallback
        await res.send(`Ho ho ho! 🎅\n${santaImageURL}`);
      }
    } catch (err) {
      // Handle Slack invalid_blocks (no face detected)
      if(isSlack && err?.data?.error === "invalid_blocks") {
        return res.reply(
          "Hmm… I couldn't put a Santa hat on that image. Make sure it has a clear face!"
        );
      }

      robot.logger.error(err);
      return res.reply(`Failed to post Santa image: ${err}`);
    }
  });
};
