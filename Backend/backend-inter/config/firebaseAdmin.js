import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let serviceAccount = null;

// 1. Try to load from Environment Variable
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("✅ Firebase Admin: Loaded from Environment Variable");
    } catch (err) {
        console.error("❌ Firebase Admin: Failed to parse Environment Variable JSON");
    }
}

// 2. If no Env Var, try to load from Local File
if (!serviceAccount) {
    try {
        const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
        if (fs.existsSync(serviceAccountPath)) {
            serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
            console.log("✅ Firebase Admin: Loaded from local serviceAccountKey.json");
        }
    } catch (err) {
        console.error("❌ Firebase Admin: Failed to read local serviceAccountKey.json");
    }
}

// 3. Initialize Admin if we have a key
if (serviceAccount) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("🚀 Firebase Admin: Initialized Successfully");
    } catch (err) {
        console.error("❌ Firebase Admin: Initialization Failed - Check your FIREBASE_SERVICE_ACCOUNT JSON");
        console.error("Error Detail:", err.message);
    }
} else {
    console.warn("⚠️ Firebase Admin: No credentials found. Initializing in sandbox mode.");
    try {
        admin.initializeApp(); // Fallback to default if possible
    } catch (e) {}
}

export default admin;
