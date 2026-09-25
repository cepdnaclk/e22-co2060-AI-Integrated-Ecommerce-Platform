import mongoose from "mongoose";

/**
 * Local Docker MongoDB -> MongoDB Atlas Synchronization Script
 * 
 * Usage:
 *   Dry Run (SAFE, ZERO WRITES):
 *     node scripts/syncLocalToAtlas.js --dry-run
 * 
 *   Execute Migration (PERFORMS SYNC TO ATLAS):
 *     node scripts/syncLocalToAtlas.js --execute --confirm
 */

const LOCAL_URI = process.env.LOCAL_MONGO_URI || "mongodb://mongodb:27017/ecommerce";
const ATLAS_URI = process.env.ATLAS_MONGO_URI || "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");
const isConfirmed = args.includes("--confirm");
const isDryRun = !isExecute || args.includes("--dry-run");

async function main() {
  console.log("=========================================");
  console.log(" LOCAL MONGODB -> ATLAS MONGODB SYNC ");
  console.log("=========================================");
  console.log(`MODE: ${isDryRun ? "DRY RUN (READ-ONLY, ZERO WRITES)" : "EXECUTE (WRITING TO ATLAS)"}`);
  console.log(`SOURCE: LOCAL DOCKER MONGODB (${LOCAL_URI.replace(/\/\/[^@]+@/, "//***:***@")})`);
  console.log(`TARGET: MONGODB ATLAS CLUSTER0 (${ATLAS_URI.replace(/\/\/[^@]+@/, "//***:***@")})`);
  console.log("=========================================\n");

  if (isExecute && !isConfirmed) {
    console.error("❌ ERROR: Execute mode requires explicit confirmation!");
    console.error("Please run with: node scripts/syncLocalToAtlas.js --execute --confirm");
    process.exit(1);
  }

  let localConn, atlasConn;

  try {
    console.log("Connecting to Local Docker MongoDB...");
    localConn = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log("✅ Connected to Local Docker MongoDB");

    console.log("Connecting to MongoDB Atlas...");
    atlasConn = await mongoose.createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ Connection failure:", err.message);
    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
    process.exit(1);
  }

  const localDb = localConn.db;
  const atlasDb = atlasConn.db;

  // 1. READ ALL DOCUMENTS FROM BOTH DATABASES
  console.log("\nFetching documents from Local and Atlas...");
  const localProducts = await localDb.collection("products").find({}).toArray();
  const localOffers = await localDb.collection("selleroffers").find({}).toArray();

  const atlasProducts = await atlasDb.collection("products").find({}).toArray();
  const atlasOffers = await atlasDb.collection("selleroffers").find({}).toArray();

  const localApprovedCount = localProducts.filter(p => p.approvalStatus === "approved").length;
  const atlasApprovedCount = atlasProducts.filter(p => p.approvalStatus === "approved").length;

  console.log("\n-----------------------------------------");
  console.log("CURRENT STATE COMPARISON");
  console.log("-----------------------------------------");
  console.log(`LOCAL  -> Products: ${localProducts.length} | SellerOffers: ${localOffers.length} | Approved: ${localApprovedCount}`);
  console.log(`ATLAS  -> Products: ${atlasProducts.length} | SellerOffers: ${atlasOffers.length} | Approved: ${atlasApprovedCount}`);

  // Map by ID
  const localProdMap = new Map(localProducts.map(p => [p._id.toString(), p]));
  const atlasProdMap = new Map(atlasProducts.map(p => [p._id.toString(), p]));

  const localOfferMap = new Map(localOffers.map(o => [o._id.toString(), o]));
  const atlasOfferMap = new Map(atlasOffers.map(o => [o._id.toString(), o]));

  // ID set differences
  const localOnlyProdIds = [...localProdMap.keys()].filter(id => !atlasProdMap.has(id));
  const atlasOnlyProdIds = [...atlasProdMap.keys()].filter(id => !localProdMap.has(id));

  const localOnlyOfferIds = [...localOfferMap.keys()].filter(id => !atlasOfferMap.has(id));
  const atlasOnlyOfferIds = [...atlasOfferMap.keys()].filter(id => !localOfferMap.has(id));

  console.log(`\nProducts missing in Atlas (to be inserted): ${localOnlyProdIds.length}`);
  if (localOnlyProdIds.length > 0) {
    console.log("Sample missing product names:", localOnlyProdIds.slice(0, 5).map(id => localProdMap.get(id).productName));
  }

  console.log(`Products in Atlas only (NOT in Local): ${atlasOnlyProdIds.length}`);
  if (atlasOnlyProdIds.length > 0) {
    console.log("⚠️ WARNING: Atlas has products missing locally:", atlasOnlyProdIds);
  }

  console.log(`SellerOffers missing in Atlas (to be inserted): ${localOnlyOfferIds.length}`);
  console.log(`SellerOffers in Atlas only (NOT in Local): ${atlasOnlyOfferIds.length}`);

  // Product field diffs for common IDs
  const prodsToUpdate = [];
  for (const [id, lp] of localProdMap.entries()) {
    const ap = atlasProdMap.get(id);
    if (ap) {
      if (
        lp.approvalStatus !== ap.approvalStatus ||
        lp.productName !== ap.productName ||
        lp.category !== ap.category ||
        lp.brand !== ap.brand ||
        lp.facebookStatus !== ap.facebookStatus
      ) {
        prodsToUpdate.push({ id, name: lp.productName, localStatus: lp.approvalStatus, atlasStatus: ap.approvalStatus });
      }
    }
  }

  console.log(`Common Products requiring field updates in Atlas: ${prodsToUpdate.length}`);
  if (prodsToUpdate.length > 0) {
    console.log("Sample products requiring field updates:", prodsToUpdate.slice(0, 5));
  }

  // Offer field diffs for common IDs
  const offersToUpdate = [];
  for (const [id, lo] of localOfferMap.entries()) {
    const ao = atlasOfferMap.get(id);
    if (ao) {
      if (lo.price !== ao.price || lo.stock !== ao.stock || lo.isActive !== ao.isActive) {
        offersToUpdate.push({ id, localPrice: lo.price, atlasPrice: ao.price });
      }
    }
  }

  console.log(`Common SellerOffers requiring updates in Atlas: ${offersToUpdate.length}`);

  // 2. DRY RUN REPORT OR EXECUTE WRITES
  if (isDryRun) {
    console.log("\n=========================================");
    console.log(" DRY RUN SUMMARY (ZERO WRITES PERFORMED) ");
    console.log("=========================================");
    console.log(`• Products to insert into Atlas: ${localOnlyProdIds.length}`);
    console.log(`• Products to update in Atlas: ${prodsToUpdate.length}`);
    console.log(`• SellerOffers to insert into Atlas: ${localOnlyOfferIds.length}`);
    console.log(`• SellerOffers to update in Atlas: ${offersToUpdate.length}`);
    console.log(`• Atlas-only products (will be preserved): ${atlasOnlyProdIds.length}`);
    console.log(`• Atlas-only seller offers (will be preserved): ${atlasOnlyOfferIds.length}`);
    console.log("\nResulting Atlas State after migration would be:");
    console.log(`  Products: ${localProducts.length}`);
    console.log(`  SellerOffers: ${localOffers.length}`);
    console.log(`  Approved products: ${localApprovedCount}`);
    console.log("\nRun with --execute --confirm to apply these changes to MongoDB Atlas.");

    await localConn.close();
    await atlasConn.close();
    process.exit(0);
  }

  // EXECUTE MODE
  console.log("\n=========================================");
  console.log(" EXECUTING SYNCHRONIZATION TO ATLAS ");
  console.log("=========================================");

  // Bulk upsert Products
  const prodOps = localProducts.map(doc => ({
    replaceOne: {
      filter: { _id: doc._id },
      replacement: doc,
      upsert: true
    }
  }));

  if (prodOps.length > 0) {
    console.log(`Upserting ${prodOps.length} products to Atlas...`);
    const res = await atlasDb.collection("products").bulkWrite(prodOps);
    console.log(`✅ Products BulkWrite Result: Upserted=${res.upsertedCount}, Modified=${res.modifiedCount}, Matched=${res.matchedCount}`);
  }

  // Bulk upsert SellerOffers
  const offerOps = localOffers.map(doc => ({
    replaceOne: {
      filter: { _id: doc._id },
      replacement: doc,
      upsert: true
    }
  }));

  if (offerOps.length > 0) {
    console.log(`Upserting ${offerOps.length} seller offers to Atlas...`);
    const res = await atlasDb.collection("selleroffers").bulkWrite(offerOps);
    console.log(`✅ SellerOffers BulkWrite Result: Upserted=${res.upsertedCount}, Modified=${res.modifiedCount}, Matched=${res.matchedCount}`);
  }

  // 3. POST-MIGRATION VERIFICATION
  console.log("\n-----------------------------------------");
  console.log("POST-MIGRATION VERIFICATION");
  console.log("-----------------------------------------");
  const postAtlasProducts = await atlasDb.collection("products").find({}).toArray();
  const postAtlasOffers = await atlasDb.collection("selleroffers").find({}).toArray();
  const postAtlasApproved = postAtlasProducts.filter(p => p.approvalStatus === "approved").length;

  console.log(`Atlas Products: ${postAtlasProducts.length} (Target: 159)`);
  console.log(`Atlas SellerOffers: ${postAtlasOffers.length} (Target: 158)`);
  console.log(`Atlas Approved Products: ${postAtlasApproved} (Target: 5)`);

  if (postAtlasProducts.length === 159 && postAtlasOffers.length === 158 && postAtlasApproved === 5) {
    console.log("\n🎉 SUCCESS: MongoDB Atlas is fully synchronized with Local Docker MongoDB!");
  } else {
    console.warn("\n⚠️ WARNING: Post-migration verification count mismatch. Please inspect Atlas database.");
  }

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error during sync script execution:", err);
  process.exit(1);
});
