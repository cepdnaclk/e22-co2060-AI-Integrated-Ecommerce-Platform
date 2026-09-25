const mongoose = require('mongoose');
const fs = require('fs');

const ATLAS_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

const KEEP_IDS = [
  "6a605faa5f4f80e65174226d",
  "6ab006889863c1ae62b989c0"
];

const DISABLE_IDS = [
  "6ab0053ca48e398e32585958",
  "6ab0057f597bbe5602a9ccc7",
  "6ab005fea90b106fceb7b898",
  "6ab00637fc7fbf6f67de57b0",
  "6ab0050644a3fa8764ba8d6e"
];

async function executeCleanup() {
  console.log("Connecting to MongoDB Atlas for EXECUTION of test data cleanup...");
  const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const db = conn.db;

  const productsColl = db.collection('products');
  const offersColl = db.collection('selleroffers');

  console.log("\n=================================================================");
  console.log(" EXECUTING SOFT-DELETE CLEANUP OF CONFIRMED TEST ARTIFACTS");
  console.log("=================================================================\n");

  const executionLog = [];

  // 1. Soft-delete / Deactivate SellerOffers associated with DISABLE_IDS
  const disableObjectIds = DISABLE_IDS.map(id => new mongoose.Types.ObjectId(id));

  const offerUpdateResult = await offersColl.updateMany(
    {
      $or: [
        { productId: { $in: disableObjectIds } },
        { productId: { $in: DISABLE_IDS } },
        { product: { $in: disableObjectIds } },
        { product: { $in: DISABLE_IDS } }
      ]
    },
    {
      $set: {
        isActive: false,
        status: "inactive",
        updatedAt: new Date()
      }
    }
  );

  console.log(`✅ SellerOffers Update Result: matched ${offerUpdateResult.matchedCount}, modified ${offerUpdateResult.modifiedCount}`);
  executionLog.push(`SellerOffers deactivated: matched ${offerUpdateResult.matchedCount}, modified ${offerUpdateResult.modifiedCount}`);

  // 2. Soft-delete / Deactivate Product documents (approvalStatus: "rejected", minPrice: null, maxPrice: null, totalStock: 0, hasActiveOffers: false)
  const productUpdateResult = await productsColl.updateMany(
    { _id: { $in: disableObjectIds } },
    {
      $set: {
        approvalStatus: "rejected",
        minPrice: null,
        maxPrice: null,
        totalStock: 0,
        hasActiveOffers: false,
        embeddingUpdatedAt: new Date()
      }
    }
  );

  console.log(`✅ Products Update Result: matched ${productUpdateResult.matchedCount}, modified ${productUpdateResult.modifiedCount}`);
  executionLog.push(`Products updated: matched ${productUpdateResult.matchedCount}, modified ${productUpdateResult.modifiedCount}`);

  // 3. Recalculate metrics for ALL target products (both KEEP and DISABLE)
  console.log("\n--- RECALCULATING METRICS FOR ALL TARGET PRODUCTS ---");
  const allTargetIds = [...KEEP_IDS, ...DISABLE_IDS];
  const updatedProducts = [];

  for (const pIdStr of allTargetIds) {
    const pObjId = new mongoose.Types.ObjectId(pIdStr);
    
    // Fetch active seller offers
    const activeOffers = await offersColl.find({
      $or: [{ productId: pObjId }, { productId: pIdStr }, { product: pObjId }, { product: pIdStr }],
      isActive: true
    }).toArray();

    let minPrice = null;
    let maxPrice = null;
    let totalStock = 0;
    let hasActiveOffers = false;

    if (activeOffers.length > 0) {
      const prices = activeOffers.map(o => o.price).filter(p => typeof p === 'number' && !isNaN(p) && p >= 0);
      if (prices.length > 0) {
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }
      totalStock = activeOffers.reduce((sum, o) => sum + (o.stock || 0), 0);
      hasActiveOffers = true;
    }

    // Keep product metric synced if product is not rejected
    const prodDoc = await productsColl.findOne({ _id: pObjId });
    if (prodDoc && prodDoc.approvalStatus !== 'rejected') {
      await productsColl.updateOne(
        { _id: pObjId },
        {
          $set: {
            minPrice,
            maxPrice,
            totalStock,
            hasActiveOffers,
            embeddingUpdatedAt: new Date()
          }
        }
      );
    }

    const finalProd = await productsColl.findOne({ _id: pObjId });
    updatedProducts.push({
      _id: pIdStr,
      productName: finalProd.productName || finalProd.title,
      approvalStatus: finalProd.approvalStatus,
      minPrice: finalProd.minPrice,
      maxPrice: finalProd.maxPrice,
      totalStock: finalProd.totalStock,
      hasActiveOffers: finalProd.hasActiveOffers,
      activeOffersCount: activeOffers.length
    });

    console.log(`Synced Product [${pIdStr}]: status=${finalProd.approvalStatus}, minPrice=${finalProd.minPrice}, totalStock=${finalProd.totalStock}, hasActiveOffers=${finalProd.hasActiveOffers}`);
  }

  // Save execution output state
  fs.writeFileSync('scratch/cleanup_execution_results.json', JSON.stringify({
    executionTimestamp: new Date().toISOString(),
    executionLog,
    updatedProducts
  }, null, 2));

  console.log("\nCleanup execution completed successfully! Results written to scratch/cleanup_execution_results.json");
  await conn.close();
  process.exit(0);
}

executeCleanup();
