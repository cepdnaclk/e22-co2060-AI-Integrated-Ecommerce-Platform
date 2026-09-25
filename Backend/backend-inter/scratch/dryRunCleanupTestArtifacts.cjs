const mongoose = require('mongoose');
const fs = require('fs');

const ATLAS_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

const KEEP_IDS = [
  "6a605faa5f4f80e65174226d", // Original July 2026 record (LKR 290,000)
  "6ab006889863c1ae62b989c0"  // Verified active test record (LKR 450,000)
];

const DISABLE_IDS = [
  "6ab0053ca48e398e32585958", // Duplicate #2 (LKR 450,000)
  "6ab0057f597bbe5602a9ccc7", // Duplicate #3 (LKR 450,000)
  "6ab005fea90b106fceb7b898", // Duplicate #4 (LKR 450,000)
  "6ab00637fc7fbf6f67de57b0", // Duplicate #5 (LKR 450,000)
  "6ab0050644a3fa8764ba8d6e"  // Interrupted orphan test record (No offer)
];

async function runDryRun() {
  console.log("Connecting to MongoDB Atlas for DRY-RUN verification...");
  const conn = await mongoose.createConnection(ATLAS_URI).asPromise();
  const db = conn.db;

  const productsColl = db.collection('products');
  const offersColl = db.collection('selleroffers');

  // 1. Create full backup of affected records
  const allTargetProductIds = [...KEEP_IDS, ...DISABLE_IDS];
  const backupProducts = await productsColl.find({ _id: { $in: allTargetProductIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();
  const backupOffers = await offersColl.find({
    $or: [
      { productId: { $in: allTargetProductIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { productId: { $in: allTargetProductIds } },
      { product: { $in: allTargetProductIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { product: { $in: allTargetProductIds } }
    ]
  }).toArray();

  const backupData = {
    timestamp: new Date().toISOString(),
    atlasUri: "mongodb+srv://admin:***@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority",
    targetProductIds: allTargetProductIds,
    products: backupProducts,
    offers: backupOffers
  };

  fs.writeFileSync('scratch/mongodb_atlas_backup_confirmed_test_artifacts.json', JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup created: scratch/mongodb_atlas_backup_confirmed_test_artifacts.json (${backupProducts.length} products, ${backupOffers.length} seller offers)\n`);

  console.log("=================================================================");
  console.log(" DRY-RUN CLEANUP PLAN: CONFIRMED TEST DATA ARTIFACTS");
  console.log("=================================================================\n");

  console.log("--- RECORDS TO KEEP (UNTOUCHED) ---");
  for (const id of KEEP_IDS) {
    const prod = backupProducts.find(p => p._id.toString() === id);
    const prodOffers = backupOffers.filter(o => (o.productId && o.productId.toString() === id) || (o.product && o.product.toString() === id));
    console.log(`[KEEP] Product ID: ${id}`);
    console.log(`  Title: ${prod ? prod.productName || prod.title : 'NOT FOUND'}`);
    console.log(`  Brand: ${prod ? prod.brand : 'N/A'} | Price: LKR ${prod ? prod.minPrice : 'N/A'}`);
    console.log(`  Linked Active Offers: ${prodOffers.length}`);
    for (const o of prodOffers) {
      console.log(`    - Offer ID: ${o._id} | Seller: ${o.sellerName} | Price: LKR ${o.price} | Stock: ${o.stock} | isActive: ${o.isActive}`);
    }
    console.log('');
  }

  console.log("--- RECORDS TO DISABLE / CLEAN UP ---");
  let totalOffersToDisable = 0;

  for (const id of DISABLE_IDS) {
    const prod = backupProducts.find(p => p._id.toString() === id);
    const prodOffers = backupOffers.filter(o => (o.productId && o.productId.toString() === id) || (o.product && o.product.toString() === id));
    totalOffersToDisable += prodOffers.length;

    console.log(`[DISABLE] Product ID: ${id}`);
    console.log(`  Title: ${prod ? prod.productName || prod.title : 'NOT FOUND'}`);
    console.log(`  Current minPrice: ${prod ? prod.minPrice : 'N/A'} | totalStock: ${prod ? prod.totalStock : 'N/A'} | hasActiveOffers: ${prod ? prod.hasActiveOffers : 'N/A'}`);
    console.log(`  Linked Seller Offers (${prodOffers.length}):`);
    if (prodOffers.length === 0) {
      console.log(`    - None (Orphaned product)`);
    } else {
      for (const o of prodOffers) {
        console.log(`    - Offer ID: ${o._id} | Seller: ${o.sellerName} | Price: LKR ${o.price} | Stock: ${o.stock} | Current isActive: ${o.isActive} ==> WILL SET isActive: false`);
      }
    }
    console.log(`  Planned Product Modification: minPrice -> null, maxPrice -> null, totalStock -> 0, hasActiveOffers -> false, approvalStatus -> 'rejected'`);
    console.log('--------------------------------------------------');
  }

  console.log("\n=================================================================");
  console.log(" DRY-RUN SUMMARY");
  console.log("=================================================================");
  console.log(`Products to KEEP: ${KEEP_IDS.length}`);
  console.log(`Products to DISABLE/CLEANUP: ${DISABLE_IDS.length}`);
  console.log(`Associated Seller Offers to DISABLE: ${totalOffersToDisable}`);
  console.log(`Backup Location: scratch/mongodb_atlas_backup_confirmed_test_artifacts.json`);
  console.log("=================================================================\n");

  await conn.close();
  process.exit(0);
}

runDryRun();
