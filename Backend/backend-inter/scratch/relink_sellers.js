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

async function relink() {
  const cloudURI = process.env.MONGO_URI;
  await mongoose.connect(cloudURI);
  const db = mongoose.connection.db;

  // Load users_dump to build a mapping: dockerUserId -> email
  const usersFile = path.join(__dirname, 'users_dump.json');
  const userLines = fs.readFileSync(usersFile, 'utf8').split('\n').filter(l => l.trim());
  
  const dockerIdToEmail = {};
  for (const line of userLines) {
    const raw = JSON.parse(line);
    const dockerId = raw._id.$oid || raw._id;
    dockerIdToEmail[dockerId.toString()] = raw.email;
  }

  console.log(`Built mapping for ${Object.keys(dockerIdToEmail).length} users.`);

  // Load sellers_dump and re-link userId to the cloud user's _id
  const sellersFile = path.join(__dirname, 'sellers_dump.json');
  const sellerLines = fs.readFileSync(sellersFile, 'utf8').split('\n').filter(l => l.trim());
  
  let fixed = 0;
  let skipped = 0;

  for (const line of sellerLines) {
    const raw = JSON.parse(line);
    const sellerData = cleanData(raw);
    const dockerUserId = (raw.userId?.$oid || raw.userId).toString();
    const email = dockerIdToEmail[dockerUserId];

    if (!email) {
      console.warn(`No email found for userId: ${dockerUserId}`);
      skipped++;
      continue;
    }

    // Find the cloud user by email to get their actual cloud _id
    const cloudUser = await db.collection('users').findOne({ email });
    if (!cloudUser) {
      console.warn(`Cloud user not found for email: ${email}`);
      skipped++;
      continue;
    }

    // Upsert seller with correctly linked cloud userId
    sellerData.userId = cloudUser._id;
    const sellerId = sellerData._id;
    delete sellerData._id;

    await db.collection('sellers').updateOne(
      { userId: cloudUser._id },
      { $set: sellerData },
      { upsert: true }
    );

    console.log(`✅ Re-linked seller for ${email} (shopName: ${sellerData.shopName})`);
    fixed++;
  }

  console.log(`\n✨ Done! Fixed: ${fixed}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

relink().catch(e => { console.error(e); process.exit(1); });
