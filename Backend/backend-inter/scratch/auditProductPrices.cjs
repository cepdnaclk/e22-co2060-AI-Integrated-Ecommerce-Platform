require('dotenv').config();
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: String,
  brand: String,
  category: String,
  minPrice: Number,
  maxPrice: Number,
  totalStock: Number,
}, { strict: false });

const sellerOfferSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  price: Number,
  stock: Number,
  status: String,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const SellerOffer = mongoose.models.SellerOffer || mongoose.model('SellerOffer', sellerOfferSchema);

async function auditPrices() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found in env");
      process.exit(1);
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB Atlas.");

    const products = await Product.find({}).lean();
    const sellerOffers = await SellerOffer.find({}).lean();

    console.log(`Total Products: ${products.length}`);
    console.log(`Total Seller Offers: ${sellerOffers.length}\n`);

    // Map seller offers by product ID
    const offersByProduct = {};
    for (const offer of sellerOffers) {
      const pId = offer.product ? offer.product.toString() : null;
      if (pId) {
        if (!offersByProduct[pId]) offersByProduct[pId] = [];
        offersByProduct[pId].push(offer);
      }
    }

    console.log("=================================================================");
    console.log(" 1. AUDIT OF SPECIFIC ITEMS REQUESTED BY USER");
    console.log("=================================================================\n");

    const targetKeywords = [
      'ASUS ROG Zephyrus G14',
      'ASUS ROG Zephyrus G16',
      'MacBook Air M3',
      'Samsung Galaxy S25 Ultra',
      'Razer BlackWidow V4 Keyboard'
    ];

    for (const kw of targetKeywords) {
      const matches = products.filter(p => p.title && p.title.toLowerCase().includes(kw.toLowerCase()));
      console.log(`--- Keyword: "${kw}" (${matches.length} matching products) ---`);
      for (const p of matches) {
        const pOffers = offersByProduct[p._id.toString()] || [];
        const offerPrices = pOffers.map(o => `LKR ${o.price} (stock: ${o.stock}, status: ${o.status})`).join(', ');
        console.log(`ID: ${p._id}`);
        console.log(`Title: ${p.title}`);
        console.log(`Brand: ${p.brand || 'N/A'}`);
        console.log(`Category: ${p.category || 'N/A'}`);
        console.log(`minPrice: LKR ${p.minPrice} | maxPrice: LKR ${p.maxPrice}`);
        console.log(`totalStock: ${p.totalStock}`);
        console.log(`Active Offers: ${offerPrices || 'None'}`);
        console.log('');
      }
    }

    console.log("=================================================================");
    console.log(" 2. ALL PRODUCTS WITH PRICE BELOW LKR 100,000");
    console.log("=================================================================\n");

    const under100k = products.filter(p => (p.minPrice && p.minPrice < 100000) || (p.maxPrice && p.maxPrice < 100000));
    console.log(`Found ${under100k.length} products under LKR 100,000:\n`);

    for (const p of under100k) {
      const pOffers = offersByProduct[p._id.toString()] || [];
      const offerPrices = pOffers.map(o => `LKR ${o.price} (stock: ${o.stock}, status: ${o.status})`).join(', ');
      console.log(`ID: ${p._id}`);
      console.log(`Title: ${p.title}`);
      console.log(`Brand: ${p.brand || 'N/A'}`);
      console.log(`Category: ${p.category || 'N/A'}`);
      console.log(`minPrice: LKR ${p.minPrice} | maxPrice: LKR ${p.maxPrice}`);
      console.log(`totalStock: ${p.totalStock}`);
      console.log(`Active Offers: ${offerPrices || 'None'}`);
      console.log('--------------------------------------------------');
    }

    console.log("=================================================================");
    console.log(" 3. COMPLETE LIST OF ALL 159 PRODUCTS (SUMMARY TABLE)");
    console.log("=================================================================\n");

    for (const p of products) {
      const pOffers = offersByProduct[p._id.toString()] || [];
      const offerPrices = pOffers.map(o => `LKR ${o.price} (stock: ${o.stock})`).join('; ');
      console.log(`[${p._id}] | ${p.title} | Brand: ${p.brand || 'N/A'} | Cat: ${p.category || 'N/A'} | minPrice: ${p.minPrice} | maxPrice: ${p.maxPrice} | Stock: ${p.totalStock} | Offers: ${offerPrices}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Audit error:", err);
    process.exit(1);
  }
}

auditPrices();
