require('dotenv').config();
const mongoose = require('mongoose');

async function inspectRaw() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');
    const sellerOffersCollection = db.collection('selleroffers');

    const sampleProducts = await productsCollection.find({}).limit(10).toArray();
    console.log("=== RAW PRODUCT DOCUMENT SAMPLES ===");
    console.log(JSON.stringify(sampleProducts[0], null, 2));

    // Find specific targets
    const targets = await productsCollection.find({
      $or: [
        { name: { $regex: /zephyrus|macbook|s25|blackwidow|dell|lg/i } },
        { title: { $regex: /zephyrus|macbook|s25|blackwidow|dell|lg/i } }
      ]
    }).toArray();

    console.log(`\n=== FOUND ${targets.length} TARGET MATCHES ===`);
    for (const p of targets) {
      const pId = p._id;
      const offers = await sellerOffersCollection.find({ product: pId }).toArray();
      console.log({
        _id: p._id,
        name: p.name,
        title: p.title,
        brand: p.brand,
        category: p.category,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
        price: p.price,
        totalStock: p.totalStock,
        stock: p.stock,
        offers: offers.map(o => ({ _id: o._id, price: o.price, stock: o.stock, status: o.status }))
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectRaw();
