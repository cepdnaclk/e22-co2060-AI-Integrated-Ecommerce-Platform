import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target duplicate test records to set to "rejected" & deactivate offers
const TARGET_DUPLICATE_IDS = [
  "6ab0053ca48e398e32585958",
  "6ab0057f597bbe5602a9ccc7",
  "6ab005fea90b106fceb7b898",
  "6ab00637fc7fbf6f67de57b0",
  "6ab0050644a3fa8764ba8d6e" // orphan test artifact
];

// Preserved active products (MUST NOT BE MODIFIED)
const PRESERVED_PRODUCT_IDS = [
  "6a605faa5f4f80e65174226d", // Original catalog S25 (290,000)
  "6ab006889863c1ae62b989c0"  // Active verified test S25 (450,000)
];

async function run() {
  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute") && args.includes("--confirm");

  console.log("=================================================");
  console.log(` S25 DUPLICATE CLEANUP SCRIPT - MODE: ${isExecute ? "EXECUTION" : "DRY RUN"}`);
  console.log("=================================================\n");

  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://mongodb:27017/ecommerce";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.\n");

    const targetProducts = await productModel.find({ _id: { $in: TARGET_DUPLICATE_IDS } }).lean();
    const targetOffers = await sellerOfferModel.find({ productId: { $in: TARGET_DUPLICATE_IDS } }).lean();

    console.log(`Found ${targetProducts.length} target product records to process.`);
    console.log(`Found ${targetOffers.length} seller offer records associated with targets.\n`);

    console.log("--- TARGET RECORDS SUMMARY ---");
    for (const p of targetProducts) {
      const pOffers = targetOffers.filter(o => o.productId.toString() === p._id.toString());
      const activeOffers = pOffers.filter(o => o.isActive);
      const price = activeOffers.length > 0 ? activeOffers[0].price : (pOffers.length > 0 ? pOffers[0].price : "N/A");
      
      const plannedAction = p._id.toString() === "6ab0050644a3fa8764ba8d6e"
        ? "Set approvalStatus='rejected' (Orphan Test Record)"
        : "Set approvalStatus='rejected', Deactivate Seller Offers";

      console.log(`ID: ${p._id.toString()} | Name: "${p.productName}" | approvalStatus: "${p.approvalStatus}" | activeOffers: ${activeOffers.length}/${pOffers.length} | price: ${price} | Action: ${plannedAction}`);
    }

    console.log("\n--- PRESERVED RECORDS (UNTOUCHED) ---");
    const preservedProducts = await productModel.find({ _id: { $in: PRESERVED_PRODUCT_IDS } }).lean();
    for (const p of preservedProducts) {
      const pOffers = await sellerOfferModel.find({ productId: p._id, isActive: true }).lean();
      const price = pOffers.length > 0 ? pOffers[0].price : "N/A";
      console.log(`ID: ${p._id.toString()} | Name: "${p.productName}" | approvalStatus: "${p.approvalStatus}" | activeOffers: ${pOffers.length} | price: ${price} | Action: PRESERVE`);
    }

    if (!isExecute) {
      console.log("\n=================================================");
      console.log(" [DRY RUN COMPLETE] Zero database changes made.");
      console.log(" To execute updates, run with: --execute --confirm");
      console.log("=================================================");
      await mongoose.disconnect();
      return;
    }

    // --- EXECUTION MODE ---
    console.log("\n=================================================");
    console.log(" CREATING BACKUP BEFORE DATABASE MODIFICATION...");
    console.log("=================================================");

    const backupData = {
      timestamp: new Date().toISOString(),
      targetProductIds: TARGET_DUPLICATE_IDS,
      products: targetProducts,
      sellerOffers: targetOffers
    };

    // Save backup to scratch directory
    const scratchDir = path.join(__dirname, "../scratch");
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    const backupPath = path.join(scratchDir, "s25_cleanup_backup.json");
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`Backup saved to: ${backupPath}`);

    console.log("\nExecuting database updates...");

    // 1. Update product approvalStatus to "rejected"
    const productUpdateResult = await productModel.updateMany(
      { _id: { $in: TARGET_DUPLICATE_IDS } },
      { $set: { approvalStatus: "rejected" } }
    );
    console.log(`Updated ${productUpdateResult.modifiedCount} Product documents to approvalStatus='rejected'.`);

    // 2. Deactivate test seller offers for target products
    const offerUpdateResult = await sellerOfferModel.updateMany(
      { productId: { $in: TARGET_DUPLICATE_IDS } },
      { $set: { isActive: false } }
    );
    console.log(`Deactivated ${offerUpdateResult.modifiedCount} SellerOffer documents.`);

    console.log("\n=================================================");
    console.log(" [EXECUTION COMPLETE] Database update successful.");
    console.log("=================================================");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Cleanup Error:", err);
    process.exit(1);
  }
}

run();
