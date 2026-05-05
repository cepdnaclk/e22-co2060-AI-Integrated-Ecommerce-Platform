/**
 * Verifies a Firebase ID token using Google's public RSA keys.
 * No Firebase Admin SDK or service account credentials required.
 *
 * Firebase ID tokens are RS256-signed JWTs. Google publishes the public
 * signing keys at a well-known URL. We download the key matching the
 * token's `kid` header claim and verify the signature with `jsonwebtoken`.
 */

import jwt from "jsonwebtoken";
import https from "https";

const FIREBASE_PROJECT_ID = "ai-ml-e-commerce-platform";
const GOOGLE_PUBLIC_KEYS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cachedKeys = null;
let cacheExpiry = 0;

/**
 * Fetch Google's public signing keys (cached until they expire per Cache-Control).
 */
async function getGooglePublicKeys() {
  const now = Date.now();
  if (cachedKeys && now < cacheExpiry) return cachedKeys;

  return new Promise((resolve, reject) => {
    https.get(GOOGLE_PUBLIC_KEYS_URL, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const keys = JSON.parse(data);

          // Parse Cache-Control max-age to cache the keys correctly
          const cacheControl = res.headers["cache-control"] || "";
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600_000;

          cachedKeys = keys;
          cacheExpiry = Date.now() + maxAge;
          resolve(keys);
        } catch (err) {
          reject(new Error("Failed to parse Google public keys: " + err.message));
        }
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * Verify a Firebase ID token and return the decoded payload.
 * Throws if the token is invalid, expired, or from the wrong project.
 *
 * @param {string} idToken  Raw Firebase ID token from the client
 * @returns {object}  Decoded JWT payload with uid, email, name, picture, etc.
 */
export async function verifyFirebaseIdToken(idToken) {
  // Decode header to get the `kid` (key ID) without verifying signature yet
  let header;
  try {
    const headerB64 = idToken.split(".")[0];
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  } catch {
    throw new Error("Malformed Firebase ID token");
  }

  const keys = await getGooglePublicKeys();
  const publicKey = keys[header.kid];

  if (!publicKey) {
    // Could be a very fresh token; retry once with fresh keys
    cachedKeys = null;
    const freshKeys = await getGooglePublicKeys();
    if (!freshKeys[header.kid]) {
      throw new Error("Firebase token key ID not found in Google public keys");
    }
  }

  const signingKey = keys[header.kid] || (await getGooglePublicKeys())[header.kid];

  const decoded = jwt.verify(idToken, signingKey, {
    algorithms: ["RS256"],
    audience: FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
  });

  return decoded;
}
