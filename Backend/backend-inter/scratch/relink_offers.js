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

async function relinkOffers() {
  const cloudURI = process.env.MONGO_URI;
  await mongoose.connect(cloudURI);
  const db = mongoose.connection.db;

  // Build docker sellerId -> cloud sellerId mapping using shopName as key
  const sellersFile = path.join(__dirname, 'sellers_dump.json');
  const sellerLines = fs.readFileSync(sellersFile, 'utf8').split('\n').filter(l => l.trim());

  // Map docker seller _id -> shopName
  const dockerSellerIdToShopName = {};
  for (const line of sellerLines) {
    const raw = JSON.parse(line);
    const dockerId = (raw._id?.$oid || raw._id).toString();
    dockerSellerIdToShopName[dockerId] = raw.shopName;
  }

  // Build shopName -> cloud seller _id
  const cloudSellers = await db.collection('sellers').find({}).toArray();
  const shopNameToCloudSellerId = {};
  for (const s of cloudSellers) {
    shopNameToCloudSellerId[s.shopName] = s._id;
  }

  console.log("Docker sellers:", Object.keys(dockerSellerIdToShopName).length);
  console.log("Cloud sellers:", Object.keys(shopNameToCloudSellerId).length);

  // Load selleroffers_dump and re-link sellerId
  const offersFile = path.join(__dirname, 'selleroffers_dump.json');
  const offerLines = fs.readFileSync(offersFile, 'utf8').split('\n').filter(l => l.trim());

  let fixed = 0;
  let skipped = 0;

  for (const line of offerLines) {
    const raw = JSON.parse(line);
    const offerData = cleanData(raw);
    const dockerSellerId = (raw.sellerId?.$oid || raw.sellerId).toString();
    const shopName = dockerSellerIdToShopName[dockerSellerId];

    if (!shopName) {
      skipped++;
      continue;
    }

    const cloudSellerId = shopNameToCloudSellerId[shopName];
    if (!cloudSellerId) {
      skipped++;
      continue;
    }

    offerData.sellerId = cloudSellerId;
    const offerId = offerData._id;
    delete offerData._id;

    await db.collection('selleroffers').updateOne(
      { _id: offerId },
      { $set: offerData },
      { upsert: true }
    );
    fixed++;
  }

  console.log(`\n✅ Re-linked ${fixed} seller offers. Skipped: ${skipped}`);
  
  // Final verification
  console.log("\n--- Final Verification for yunethmaths@gmail.com ---");
  const user = await db.collection('users').findOne({ email: 'yunethmaths@gmail.com' });
  const seller = await db.collection('sellers').findOne({ userId: user._id });
  const offerCount = await db.collection('selleroffers').countDocuments({ sellerId: seller?._id });
  console.log(`User role: ${user?.role}`);
  console.log(`Seller shop: ${seller?.shopName}`);
  console.log(`Seller offers: ${offerCount}`);

  await mongoose.disconnect();
}

relinkOffers().catch(e => { console.error(e); process.exit(1); });
