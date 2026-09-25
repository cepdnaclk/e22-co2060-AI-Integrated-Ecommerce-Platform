import dotenv from "dotenv";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { calculateProductMetrics, generateProductEmbeddingText } from "../services/vectorSyncService.js";

dotenv.config();

/**
 * Resumable Bulk Gemini Embedding Migration Script for MongoDB Atlas
 * 
 * Usage:
 *   Dry Run (READ-ONLY, ZERO API CALLS, ZERO WRITES):
 *     docker compose run --rm backend node scripts/generateProductEmbeddings.js --dry-run
 * 
 *   Execute Migration (PERFORMS BULK EMBEDDINGS TO ATLAS):
 *     docker compose run --rm backend node scripts/generateProductEmbeddings.js --execute --confirm
 */

const ATLAS_URI = process.env.ATLAS_MONGO_URI || "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-embedding-2";
const REQUIRED_DIMENSIONS = 768;

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");
const isConfirmed = args.includes("--confirm");
const isDryRun = !isExecute || args.includes("--dry-run");

/**
 * Checks whether a Product document already possesses a valid 768-dimensional numerical embedding.
 * 
 * @param {Object} doc Product document
 * @returns {Boolean}
 */
export function isValidEmbedding(doc) {
  if (!doc || !doc.embedding || !Array.isArray(doc.embedding)) {
    return false;
  }
  if (doc.embedding.length !== REQUIRED_DIMENSIONS) {
    return false;
  }
  return doc.embedding.every(val => typeof val === "number" && !isNaN(val) && isFinite(val));
}

/**
 * Sleeps for specified milliseconds.
 * 
 * @param {Number} ms 
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls Gemini API with retry logic and exponential backoff.
 * 
 * @param {Object} ai GoogleGenerativeAI instance
 * @param {String} text Embedding input text
 * @param {Number} maxRetries Maximum retry attempts (default 3)
 * @returns {Array|null} Array of 768 floats or null on failure
 */
async function generateEmbeddingWithRetry(ai, text, maxRetries = 3) {
  let attempt = 0;
  let delayMs = 2000;

  while (attempt < maxRetries) {
    attempt++;
    try {
      let model;
      let result;
      try {
        model = ai.getGenerativeModel({ model: MODEL_NAME });
        result = await model.embedContent({
          content: { parts: [{ text }] },
          outputDimensionality: REQUIRED_DIMENSIONS
        });
      } catch (err1) {
        if (err1.message.includes("404") || err1.message.includes("not found")) {
          model = ai.getGenerativeModel({ model: `models/${MODEL_NAME}` });
          result = await model.embedContent({
            content: { parts: [{ text }] },
            outputDimensionality: REQUIRED_DIMENSIONS
          });
        } else {
          throw err1;
        }
      }

      const vector = result && result.embedding ? result.embedding.values : null;

      // Validate vector format
      if (
        Array.isArray(vector) &&
        vector.length === REQUIRED_DIMENSIONS &&
        vector.every(v => typeof v === "number" && !isNaN(v) && isFinite(v))
      ) {
        return vector;
      } else {
        console.warn(`Attempt ${attempt}: Received invalid vector format from Gemini API.`);
      }
    } catch (err) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      // If client side non-transient error (not 429 or 5xx), don't retry indefinitely
      if (err.message.includes("400") || err.message.includes("401") || err.message.includes("403")) {
        console.error(`Permanent API error detected: ${err.message}`);
        return null;
      }
    }

    if (attempt < maxRetries) {
      console.log(`Waiting ${delayMs / 1000}s before retry...`);
      await sleep(delayMs);
      delayMs *= 2; // Exponential backoff: 2s -> 4s -> 8s
    }
  }

  return null;
}

async function main() {
  console.log("=========================================");
  console.log(" MONGODB ATLAS BULK GEMINI EMBEDDING MIGRATION ");
  console.log("=========================================");
  console.log(`MODE: ${isDryRun ? "DRY RUN (READ-ONLY, ZERO API CALLS, ZERO WRITES)" : "EXECUTE (WRITING TO ATLAS)"}`);
  console.log(`MODEL: ${MODEL_NAME}`);
  console.log(`TARGET DIMENSIONS: ${REQUIRED_DIMENSIONS}`);
  console.log(`TARGET DB: MONGODB ATLAS CLUSTER0 (${ATLAS_URI.replace(/\/\/[^@]+@/, "//***:***@")})`);
  console.log("=========================================\n");

  if (isExecute && !isConfirmed) {
    console.error("❌ ERROR: Execute mode requires explicit confirmation!");
    console.error("Please run with: docker compose run --rm backend node scripts/generateProductEmbeddings.js --execute --confirm");
    process.exit(1);
  }

  if (isExecute && !GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY environment variable is required for execution mode.");
    process.exit(1);
  }

  let conn;
  try {
    console.log("Connecting to MongoDB Atlas...");
    conn = await mongoose.createConnection(ATLAS_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ Connection failure:", err.message);
    process.exit(1);
  }

  const db = conn.db;
  const productsColl = db.collection("products");
  const offersColl = db.collection("selleroffers");

  // 1. FIND ALL PRODUCTS AND CATEGORIZE THEM
  console.log("\nInspecting products in Atlas...");
  const allProducts = await productsColl.find({}).toArray();
  const allOffers = await offersColl.find({}).toArray();

  const validProducts = [];
  const remainingProducts = [];

  for (const p of allProducts) {
    if (isValidEmbedding(p)) {
      validProducts.push(p);
    } else {
      remainingProducts.push(p);
    }
  }

  console.log("-----------------------------------------");
  console.log("DATABASE EMBEDDING AUDIT");
  console.log("-----------------------------------------");
  console.log(`Total Products:                     ${allProducts.length}`);
  console.log(`Already Valid (768-dim) Embeddings: ${validProducts.length}`);
  console.log(`Products Requiring Embeddings:      ${remainingProducts.length}`);
  console.log("-----------------------------------------");

  if (validProducts.length > 0) {
    console.log("Sample product with valid embedding:", {
      id: validProducts[0]._id.toString(),
      name: validProducts[0].productName,
      embeddingDimensions: validProducts[0].embedding.length,
      embeddingUpdatedAt: validProducts[0].embeddingUpdatedAt
    });
  }

  // 2. DRY RUN MODE
  if (isDryRun) {
    console.log("\n=========================================");
    console.log(" DRY RUN SUMMARY (ZERO API CALLS, ZERO WRITES) ");
    console.log("=========================================");
    console.log(`• Total Products: ${allProducts.length}`);
    console.log(`• Valid Embeddings (Will be preserved/skipped): ${validProducts.length}`);
    console.log(`• Remaining Products (Would be generated): ${remainingProducts.length}`);

    if (remainingProducts.length > 0) {
      console.log("\nSample products requiring embeddings (first 5):");
      remainingProducts.slice(0, 5).forEach((p, idx) => {
        console.log(`  ${idx + 1}. [${p._id.toString()}] ${p.productName} (${p.category})`);
      });
    }

    console.log("\n✅ DRY RUN CONFIRMATION:");
    console.log("  - Gemini API Calls Made: 0");
    console.log("  - Atlas Database Writes Made: 0");
    console.log("\nTo execute bulk migration, run:");
    console.log("  docker compose run --rm backend node scripts/generateProductEmbeddings.js --execute --confirm");

    await conn.close();
    process.exit(0);
  }

  // 3. EXECUTE MIGRATION MODE
  console.log("\n=========================================");
  console.log(" STARTING BULK GEMINI EMBEDDING MIGRATION ");
  console.log("=========================================\n");

  const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

  let successCount = 0;
  let failCount = 0;
  const failedProductIds = [];

  // Group seller offers by productId
  const offersByProductId = new Map();
  for (const offer of allOffers) {
    if (offer && offer.productId) {
      const pidStr = offer.productId.toString();
      if (!offersByProductId.has(pidStr)) {
        offersByProductId.set(pidStr, []);
      }
      offersByProductId.get(pidStr).push(offer);
    }
  }

  const totalToProcess = remainingProducts.length;

  for (let i = 0; i < totalToProcess; i++) {
    const p = remainingProducts[i];
    const pidStr = p._id.toString();
    const activeOffers = (offersByProductId.get(pidStr) || []).filter(o => o.isActive === true);
    
    const metrics = calculateProductMetrics(activeOffers);
    const embeddingText = generateProductEmbeddingText(p, metrics);

    console.log(`[${i + 1}/${totalToProcess}] Processing: ${p.productName} (ID: ${pidStr})`);

    const vector = await generateEmbeddingWithRetry(ai, embeddingText, 3);

    if (vector) {
      // Atomic Update ONLY target metadata & embedding fields
      const updatePayload = {
        embedding: vector,
        minPrice: metrics.minPrice,
        maxPrice: metrics.maxPrice,
        totalStock: metrics.totalStock,
        hasActiveOffers: metrics.hasActiveOffers,
        embeddingUpdatedAt: new Date()
      };

      await productsColl.updateOne(
        { _id: p._id },
        { $set: updatePayload }
      );

      successCount++;
      console.log(`   ✅ Embedding generated & saved successfully (768 dims)`);
    } else {
      failCount++;
      failedProductIds.push(pidStr);
      console.error(`   ❌ Failed to generate embedding after 3 retries. Skipping document.`);
    }

    // Gentle delay between products to prevent rate-limiting (300ms)
    await sleep(300);
  }

  // 4. POST-MIGRATION SUMMARY
  console.log("\n=========================================");
  console.log(" BULK MIGRATION COMPLETE SUMMARY ");
  console.log("=========================================");
  console.log(`Processed:                            ${totalToProcess}`);
  console.log(`Successful:                           ${successCount}`);
  console.log(`Failed:                               ${failCount}`);
  console.log(`Skipped (Already Valid):               ${validProducts.length}`);
  
  const finalAll = await productsColl.find({}).toArray();
  const finalValidCount = finalAll.filter(doc => isValidEmbedding(doc)).length;
  const finalRemaining = finalAll.length - finalValidCount;

  console.log(`Total Products in Atlas:              ${finalAll.length}`);
  console.log(`Total Valid 768-dim Embeddings:       ${finalValidCount}`);
  console.log(`Remaining without valid embeddings:   ${finalRemaining}`);

  if (failedProductIds.length > 0) {
    console.log(`\nFailed Product IDs:`, failedProductIds);
  }

  await conn.close();
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error during bulk migration:", err);
  process.exit(1);
});
