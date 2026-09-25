const mongoose = require('mongoose');

async function inspect() {
  const uri = process.env.MONGO_URI;
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log("Collections in DB:", collections.map(c => c.name));

  const sampleOffer = await db.collection('selleroffers').findOne({});
  console.log("\nSample SellerOffer document:");
  console.log(JSON.stringify(sampleOffer, null, 2));

  const sampleProduct = await db.collection('products').findOne({});
  console.log("\nSample Product document:");
  console.log(JSON.stringify(sampleProduct, null, 2));

  const sampleProductKeys = Object.keys(await db.collection('products').findOne({ minPrice: { $exists: true } }) || {});
  console.log("\nSample Product with minPrice keys:", sampleProductKeys);

  const productWithMinPrice = await db.collection('products').findOne({ minPrice: { $exists: true } });
  console.log("\nSample product with minPrice:", JSON.stringify(productWithMinPrice, null, 2));

  process.exit(0);
}

inspect();
