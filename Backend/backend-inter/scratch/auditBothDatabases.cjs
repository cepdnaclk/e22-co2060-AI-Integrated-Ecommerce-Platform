require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const ATLAS_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

async function auditAtlasDatabase() {
  console.log(`\n=================================================================`);
  console.log(` AUDITING MONGODB ATLAS PRODUCTION DATABASE`);
  console.log(` URI: mongodb+srv://admin:***@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority`);
  console.log(`=================================================================\n`);

  try {
    const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
    const db = conn.db;

    const products = await db.collection('products').find({}).toArray();
    const offers = await db.collection('selleroffers').find({}).toArray();

    console.log(`Loaded ${products.length} products and ${offers.length} seller offers from MongoDB Atlas.`);

    // Map seller offers by productId (both string and ObjectId)
    const offersByProduct = {};
    for (const o of offers) {
      let pId = null;
      if (o.productId) pId = o.productId.toString();
      else if (o.product) pId = o.product.toString();
      
      if (pId) {
        if (!offersByProduct[pId]) offersByProduct[pId] = [];
        offersByProduct[pId].push(o);
      }
    }

    const auditResults = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const pId = p._id.toString();
      const pOffers = offersByProduct[pId] || [];

      const title = p.productName || p.title || p.name || p.description || 'UNNAMED PRODUCT';
      const brand = p.brand || 'N/A';
      const category = p.category || 'N/A';
      
      const docMinPrice = p.minPrice !== undefined ? p.minPrice : null;
      const docMaxPrice = p.maxPrice !== undefined ? p.maxPrice : null;
      const docTotalStock = p.totalStock !== undefined ? p.totalStock : null;
      const docHasActiveOffers = p.hasActiveOffers !== undefined ? p.hasActiveOffers : null;

      const offerPrices = pOffers.map(o => o.price).filter(pr => typeof pr === 'number' && !isNaN(pr));
      const offerStocks = pOffers.map(o => o.stock).filter(st => typeof st === 'number' && !isNaN(st));

      const computedMinOfferPrice = offerPrices.length > 0 ? Math.min(...offerPrices) : null;
      const computedMaxOfferPrice = offerPrices.length > 0 ? Math.max(...offerPrices) : null;
      const computedTotalStock = offerStocks.length > 0 ? offerStocks.reduce((a, b) => a + b, 0) : 0;

      const effectiveMinPrice = docMinPrice !== null ? docMinPrice : computedMinOfferPrice;
      const effectiveMaxPrice = docMaxPrice !== null ? docMaxPrice : computedMaxOfferPrice;
      const effectiveStock = docTotalStock !== null ? docTotalStock : computedTotalStock;

      const offersFormatted = pOffers.map(o => `OfferID: ${o._id} | Price: LKR ${o.price} | Stock: ${o.stock} | Seller: ${o.sellerName || 'N/A'}`).join('; ');

      auditResults.push({
        index: i + 1,
        _id: pId,
        title,
        brand,
        category,
        docMinPrice,
        docMaxPrice,
        docTotalStock,
        docHasActiveOffers,
        computedMinOfferPrice,
        computedMaxOfferPrice,
        effectiveMinPrice,
        effectiveMaxPrice,
        effectiveStock,
        offersCount: pOffers.length,
        offersFormatted,
        rawDoc: p
      });
    }

    await conn.close();
    fs.writeFileSync('scratch/atlas_audit_results.json', JSON.stringify(auditResults, null, 2));
    console.log("Saved audit results to scratch/atlas_audit_results.json successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error auditing MongoDB Atlas:", err);
    process.exit(1);
  }
}

auditAtlasDatabase();
