import crypto from "crypto";

function resolveKey() {
  const encryptionSecret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || "";
  if (!encryptionSecret || encryptionSecret.length < 16) {
    throw new Error("Set TOKEN_ENCRYPTION_KEY (recommended) or JWT_SECRET with at least 16 characters");
  }
  return crypto.createHash("sha256").update(encryptionSecret).digest();
}

export function encryptToken(plainText) {
  const key = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(cipherText) {
  const key = resolveKey();
  const data = Buffer.from(cipherText, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
