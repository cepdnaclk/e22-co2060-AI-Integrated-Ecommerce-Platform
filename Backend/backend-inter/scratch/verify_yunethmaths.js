import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
  await mongoose.connect(mongoURI);
  const db = mongoose.connection.db;

  const email = 'yunethmaths@gmail.com';

  // 1. Find user
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    console.log("USER: NOT FOUND");
    process.exit(1);
  }
  console.log(`USER: Found | role: ${user.role} | id: ${user._id}`);

  // 2. Find seller profile
  const seller = await db.collection('sellers').findOne({ userId: user._id });
  if (!seller) {
    console.log("SELLER PROFILE: NOT FOUND");
    process.exit(1);
  }
  console.log(`SELLER PROFILE: Found | shop: ${seller.shopName} | active: ${seller.isActive} | status: ${seller.verificationStatus}`);

  // 3. Count seller offers
  const offerCount = await db.collection('selleroffers').countDocuments({ sellerId: seller._id });
  console.log(`SELLER OFFERS: ${offerCount}`);

  // 4. Compare with Docker
  console.log("\n--- Docker DB Check ---");
  await mongoose.disconnect();
  await mongoose.connect('mongodb://localhost:27017/ecommerce');
  const db2 = mongoose.connection.db;

  const dockerUser = await db2.collection('users').findOne({ email });
  const dockerSeller = await db2.collection('sellers').findOne({ userId: dockerUser?._id });
  const dockerOffers = await db2.collection('selleroffers').countDocuments({ sellerId: dockerSeller?._id });

  console.log(`Docker USER role: ${dockerUser?.role}`);
  console.log(`Docker SELLER shop: ${dockerSeller?.shopName}`);
  console.log(`Docker SELLER OFFERS: ${dockerOffers}`);

  await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
