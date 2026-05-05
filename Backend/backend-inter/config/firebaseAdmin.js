import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:", err.message);
  }
}

if (!serviceAccount) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const keyPath = path.join(__dirname, "..", "serviceAccountKey.json");

    if (fs.existsSync(keyPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(keyPath));
    }
  } catch (err) {
    console.warn("⚠️ serviceAccountKey.json not found or invalid. Ensure FIREBASE_SERVICE_ACCOUNT env var is set.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.error("❌ Firebase Admin could not be initialized: Missing service account credentials.");
}

export default admin;

