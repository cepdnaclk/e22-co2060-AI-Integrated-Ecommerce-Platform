require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

async function fullAudit() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const productsColl = db.collection('products');
    const offersColl = db.collection('selleroffers');

    const products = await productsColl.find({}).toArray();
    const offers = await offersColl.find({}).toArray();

    // Map offers by product id string
    const offersByProduct = {};
    for (const o of offers) {
      if (o.product) {
        const pId = o.product.toString();
        if (!offersByProduct[pId]) offersByProduct[pId] = [];
        offersByProduct[pId].push(o);
      }
    }

    console.log(`Loaded ${products.length} products and ${offers.length} seller offers.`);

    const auditResults = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const pId = p._id.toString();
      const pOffers = offersByProduct[pId] || [];

      const title = p.productName || p.title || p.name || p.description || 'UNNAMED PRODUCT';
      const brand = p.brand || 'N/A';
      const category = p.category || 'N/A';
      
      const docMinPrice = p.minPrice;
      const docMaxPrice = p.maxPrice;
      const docTotalStock = p.totalStock;
      const docHasActiveOffers = p.hasActiveOffers;

      const offerPrices = pOffers.map(o => o.price).filter(pr => typeof pr === 'number' && !isNaN(pr));
      const offerStocks = pOffers.map(o => o.stock).filter(st => typeof st === 'number' && !isNaN(st));

      const computedMinOfferPrice = offerPrices.length > 0 ? Math.min(...offerPrices) : null;
      const computedMaxOfferPrice = offerPrices.length > 0 ? Math.max(...offerPrices) : null;
      const computedTotalStock = offerStocks.length > 0 ? offerStocks.reduce((a, b) => a + b, 0) : 0;

      const effectiveMinPrice = docMinPrice !== undefined && docMinPrice !== null ? docMinPrice : computedMinOfferPrice;
      const effectiveMaxPrice = docMaxPrice !== undefined && docMaxPrice !== null ? docMaxPrice : computedMaxOfferPrice;
      const effectiveStock = docTotalStock !== undefined && docTotalStock !== null ? docTotalStock : computedTotalStock;

      const offersFormatted = pOffers.map(o => `OfferID: ${o._id} | Price: LKR ${o.price} | Stock: ${o.stock} | Status: ${o.status}`).join('; ');

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

    // Write full audit JSON to file for structured analysis
    fs.writeFileSync('scratch/audit_full_results.json', JSON.stringify(auditResults, null, 2));

    // Summary text output
    let summaryLines = [];
    summaryLines.push(`=== DATA QUALITY AUDIT SUMMARY (${products.length} Products) ===\n`);

    for (const res of auditResults) {
      summaryLines.push(`[${res.index}/${products.length}] ID: ${res._id}`);
      summaryLines.push(`  Title: ${res.title}`);
      summaryLines.push(`  Brand: ${res.brand} | Category: ${res.category}`);
      summaryLines.push(`  Doc Prices: min=${res.docMinPrice}, max=${res.docMaxPrice}, stock=${res.docTotalStock}, activeOffers=${res.docHasActiveOffers}`);
      summaryLines.push(`  Effective Prices: min=LKR ${res.effectiveMinPrice}, max=LKR ${res.effectiveMaxPrice}, stock=${res.effectiveStock}`);
      summaryLines.push(`  Offers (${res.offersCount}): ${res.offersFormatted || 'None'}`);
      summaryLines.push(`-----------------------------------------------------------------`);
    }

    fs.writeFileSync('scratch/audit_summary.txt', summaryLines.join('\n'));
    console.log("Audit complete. Results saved to scratch/audit_full_results.json and scratch/audit_summary.txt");

    process.exit(0);
  } catch (err) {
    console.error("Audit error:", err);
    process.exit(1);
  }
}

fullAudit();
