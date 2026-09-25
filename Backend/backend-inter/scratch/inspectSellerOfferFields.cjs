require('dotenv').config();
const mongoose = require('mongoose');

async function checkOffers() {
  const envUri = process.env.MONGO_URI || "";
  const atlasUri = envUri.startsWith("mongodb+srv://") ? envUri : (process.env.ATLAS_MONGO_URI || "mongodb+srv://admin:admin123@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority");

  console.log("Connecting to URI:", atlasUri.replace(/:[^:@]+@/, ":***@"));
  await mongoose.connect(atlasUri);
  const db = mongoose.connection.db;

  const offers = await db.collection('selleroffers').find({}).limit(5).toArray();
  const products = await db.collection('products').find({}).limit(5).toArray();

  console.log("=== SAMPLE SELLER OFFERS ===");
  console.log(JSON.stringify(offers, null, 2));

  console.log("\n=== SAMPLE PRODUCTS ===");
  console.log(JSON.stringify(products[0], null, 2));

  process.exit(0);
}

checkOffers();
