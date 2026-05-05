import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Priority 1: Use environment variable (for Railway/Cloud)
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("✅ Firebase Admin: Using service account from environment variable");
  } else {
    // Priority 2: Use local file (for Local Docker/Dev)
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const fileData = fs.readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(fileData);
      console.log("✅ Firebase Admin: Using service account from local file");
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin: Initialized successfully");
  } else {
    console.error("❌ Firebase Admin: No credentials found! Login will NOT work until FIREBASE_SERVICE_ACCOUNT is added to Railway.");
  }
} catch (error) {
  console.error("❌ Firebase Admin Initialization Error:", error.message);
}

export default admin;
