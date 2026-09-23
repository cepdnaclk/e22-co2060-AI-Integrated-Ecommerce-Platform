const crypto = require("crypto");
const env = require("../config/env");

const key = crypto.createHash("sha256").update(env.TOKEN_ENCRYPTION_KEY).digest();

function decrypt(cipherText) {
  const data = Buffer.from(cipherText, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

module.exports = { decrypt };
