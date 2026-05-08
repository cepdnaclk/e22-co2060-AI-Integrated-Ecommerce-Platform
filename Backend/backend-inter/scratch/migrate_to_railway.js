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
  console.log("🚀 Starting UNIVERSAL migration to:", mongoURI);
  
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to Database.");

    const db = mongoose.connection.db;

    // Find all *_dump.json files in the scratch directory
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('_dump.json'));
    
    for (const file of files) {
      const collectionName = file.replace('_dump.json', '');
      console.log(`📦 Syncing collection: [${collectionName}]...`);
      
      const filePath = path.join(__dirname, file);
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
      let count = 0;
      
      for (const line of lines) {
        const raw = JSON.parse(line);
        const data = cleanData(raw);
        const id = data._id;
        delete data._id;

        // Use email as unique key for users, otherwise use _id
        const filter = (collectionName === 'users') ? { email: data.email } : { _id: id };

        try {
          await db.collection(collectionName).updateOne(
            filter,
            { $set: data },
            { upsert: true }
          );
          count++;
        } catch (err) {
          if (err.code === 11000) {
            console.warn(`⚠️  Skipped duplicate in [${collectionName}]: ${err.message}`);
          } else {
            throw err;
          }
        }
      }
      console.log(`✅ Synced ${count} records to ${collectionName}.`);
    }

    console.log("\n✨ UNIVERSAL MIGRATION COMPLETE! Your cloud database is now a perfect mirror of Docker.");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateData();
