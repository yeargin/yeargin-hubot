// Description:
//   Invalidates Yubikeys by sending them to (by default) Yubicloud when they
//   are accidentally pasted into a chat room.
//
// Configuration:
//   HUBOT_YUBIKEY_VALIDATION_URL: URL to the validation server. By default,
//   this is Yubicloud.
//
//   HUBOT_YUBIKEY_API_ID: API id and key for the validation server or
//   Yubicloud. For Yubicloud, generate one at
//   <https://upgrade.yubico.com/getapikey/>

const defaultValidationUrl = 'https://api.yubico.com/wsapi/2.0/verify';
const validationUrl = process.env.HUBOT_YUBIKEY_VALIDATION_URL || defaultValidationUrl;
const apiId = process.env.HUBOT_YUBIKEY_API_ID;

const crypto = require('crypto');
const https = require('https');

module.exports = (robot) => {
  const charset = 'cbdefghijklnrtuv';
  const otpRegex = new RegExp(`(ccccc[${charset}]{39})$`);
  const dvorakCharset = 'jxe.uidchtnbpygk';
  const dvorakOtpRegex = new RegExp(`(jjjjj[${dvorakCharset}]{39})$`);

  const messagePrefix = 'Was that your YubiKey?';

  const generateNonce = () => crypto.pseudoRandomBytes(16).toString('hex');

  const invalidateOtp = (msg, otp) => https.get(`${validationUrl}?id=${apiId}&otp=${otp}&nonce=${generateNonce()}`, (res) => {
    if (res.statusCode !== 200) {
      return msg.reply(`${messagePrefix} I tried to invalidate that OTP for you, but I got a ${res.statusCode} error from the server 😢`);
    }
    return msg.reply(`${messagePrefix} I went ahead and invalidated that OTP for you 🔒`);
  });

  const invalidateDvorakOtp = (msg, dvorakOtp) => {
    let otp = dvorakOtp;
    for (let i = 0, end = dvorakCharset.length, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
      otp = otp.replace(dvorakCharset[i], charset[i]);
    }

    return invalidateOtp(msg, otp);
  };

  const missingEnvironment = (msg) => {
    let missingSomething = false;
    if (apiId == null) {
      msg.reply(`${messagePrefix} I'd like to invalidate that OTP for you, but I'm missing the HUBOT_YUBIKEY_API_ID environment variable. Maybe your local hubot maintainer can help you?`);
      missingSomething = true;
    }
    return missingSomething;
  };

  robot.hear(otpRegex, (msg) => {
    if (missingEnvironment(msg)) { return null; }
    return invalidateOtp(msg, msg.match[1]);
  });

  return robot.hear(dvorakOtpRegex, (msg) => {
    if (missingEnvironment(msg)) { return null; }
    return invalidateDvorakOtp(msg, msg.match[1]);
  });
};
