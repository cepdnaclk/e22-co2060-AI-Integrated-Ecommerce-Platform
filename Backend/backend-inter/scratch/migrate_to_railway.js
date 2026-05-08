import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

function cleanData(obj) {
  if (Array.isArray(obj)) return obj.map(cleanData);
  if (obj !== null && typeof obj === 'object') {
    if (obj.$oid) return new mongoose.Types.ObjectId(obj.$oid);
    if (obj.$date) return new Date(obj.$date);
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = cleanData(value);
    }
    return newObj;
  }
  return obj;
}

async function migrateData() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
  console.log("🚀 Starting migration to:", mongoURI);
  
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to Database.");

    const db = mongoose.connection.db;

    // --- 1. Migrate Users ---
    const usersFile = path.join(__dirname, 'users_dump.json');
    if (fs.existsSync(usersFile)) {
      console.log("👤 Syncing Users...");
      const userLines = fs.readFileSync(usersFile, 'utf8').split('\n').filter(l => l.trim());
      let userCount = 0;
      
      for (const line of userLines) {
        const rawUser = JSON.parse(line);
        const userData = cleanData(rawUser);
        const email = userData.email;
        delete userData._id;

        await db.collection('users').updateOne(
          { email: email },
          { $set: userData },
          { upsert: true }
        );
        userCount++;
      }
      console.log(`✅ Synced ${userCount} users.`);
    }

    // --- 2. Migrate Sellers ---
    const sellersFile = path.join(__dirname, 'sellers_dump.json');
    if (fs.existsSync(sellersFile)) {
      console.log("🏪 Syncing Sellers...");
      const sellerLines = fs.readFileSync(sellersFile, 'utf8').split('\n').filter(l => l.trim());
      let sellerCount = 0;
      
      for (const line of sellerLines) {
        const rawSeller = JSON.parse(line);
        const sellerData = cleanData(rawSeller);
        const sellerId = sellerData._id;
        delete sellerData._id;

        await db.collection('sellers').updateOne(
          { _id: sellerId },
          { $set: sellerData },
          { upsert: true }
        );
        sellerCount++;
      }
      console.log(`✅ Synced ${sellerCount} sellers.`);
    }

    console.log("\n✨ Migration successful! All data has been cleaned and synced.");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateData();
