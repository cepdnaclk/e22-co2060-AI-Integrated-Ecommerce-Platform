import dotenv from "dotenv";
import mongoose from "mongoose";
import { processMongoDbRagQuery } from "../services/mongodbRagService.js";

dotenv.config();

/**
 * MongoDB Atlas RAG System Test Suite (STEP 7 Retrieval Quality Verification)
 * 
 * Tests 12 distinct query scenarios with strict deduplication, product-type validation,
 * price/stock constraints, and candidate classification metrics.
 * 
 * Usage:
 *   docker compose run --rm backend node scripts/testMongoDBRag.js
 */

const ENV_MONGO_URI = process.env.MONGO_URI || "";
const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const MONGO_URI = ENV_MONGO_URI.startsWith("mongodb+srv://") ? ENV_MONGO_URI : (process.env.ATLAS_MONGO_URI || ATLAS_FALLBACK_URI);

const SKIP_LLM = process.env.SKIP_LLM !== "false"; // Default true to allow retrieval testing without LLM 429 quota block

const TEST_QUERIES = [
  "I need a powerful gaming keyboard",
  "I want a smartphone with a good camera",
  "comfortable sports clothing",
  "laptop suitable for gaming",
  "home appliance for cleaning",
  "Show me a gaming laptop under 600000 LKR",
  "I need a product that is currently in stock",
  "Show me a Samsung phone",
  "Show me a laptop under 1000 LKR",
  "Show me products between 100000 and 300000 LKR",
  "Show me something that is not available in the store",
  "I need a gaming laptop with at least one unit in stock"
];

async function runMongoDBRagTests() {
  console.log("=================================================================");
  console.log(" MONGODB ATLAS RAG RETRIEVAL QUALITY & RELIABILITY TEST SUITE ");
  console.log("=================================================================");
  console.log(`TARGET DB: MONGODB ATLAS (${MONGO_URI.replace(/\/\/[^@]+@/, "//***:***@")})`);
  console.log(`RETRIEVAL TEST MODE: ${SKIP_LLM ? "RETRIEVAL & DEDUPLICATION VERIFICATION (SKIP_LLM=true)" : "FULL END-TO-END WITH LLM"}`);
  console.log(`TOTAL TEST QUERIES: ${TEST_QUERIES.length}`);
  console.log("=================================================================\n");

  let conn;
  try {
    console.log("Connecting to MongoDB Atlas...");
    conn = await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected to MongoDB Atlas\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }

  const testSummaryResults = [];

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];
    console.log(`\n=================================================================`);
    console.log(`TEST QUERY [${i + 1}/${TEST_QUERIES.length}]: "${query}"`);
    console.log(`=================================================================`);

    try {
      const startTime = Date.now();
      const result = await processMongoDbRagQuery(query, { limit: 15, skipLlm: SKIP_LLM });
      const durationMs = Date.now() - startTime;

      console.log(`📌 Query: "${query}"`);
      console.log(`🧠 Extracted Intent:`, JSON.stringify(result.appliedFilters, null, 2));
      console.log(`📊 Raw Atlas Candidates: ${result.rawCandidateCount}`);
      console.log(`🔄 Deduplicated Candidates (_id): ${result.deduplicatedCandidateCount} (Duplicates Removed: ${result.duplicatesRemovedCount})`);
      console.log(`🏷️ Match Status: ${result.matchType} (${result.matchType === 'EXACT_MATCH' ? 'Exact Match' : (result.matchType === 'ALTERNATIVE_ONLY' ? 'Alternative Only' : 'No Match')})`);
      console.log(`⏱️ Duration: ${durationMs} ms`);
      console.log(`📦 Final Candidate Count: ${result.totalRetrieved}`);

      console.log("\n--- FINAL RETRIEVED CANDIDATES & SCORES ---");
      if (result.sources.length === 0) {
        console.log("No matching candidate products found.");
      } else {
        result.sources.forEach((src, idx) => {
          const priceStr = src.minPrice !== null
            ? (src.minPrice === src.maxPrice ? `LKR ${src.minPrice.toLocaleString()}` : `LKR ${src.minPrice.toLocaleString()} - LKR ${src.maxPrice.toLocaleString()}`)
            : "No active offers";

          console.log(`  ${idx + 1}. [ID: ${src.productId}] ${src.productName} | Brand: ${src.brand} | Cat: ${src.category} | Price: ${priceStr} | Stock: ${src.totalStock} | Score: ${src.score}`);
        });
      }

      console.log("\n--- GROUNDED RESPONSE ---");
      console.log(result.answer);
      console.log("-----------------------------------------------------------------");

      testSummaryResults.push({
        queryIndex: i + 1,
        query,
        matchType: result.matchType,
        rawCount: result.rawCandidateCount,
        dedupCount: result.deduplicatedCandidateCount,
        duplicatesRemoved: result.duplicatesRemovedCount,
        retrievedCount: result.totalRetrieved,
        filters: result.appliedFilters
      });

    } catch (queryErr) {
      console.error(`❌ Error executing RAG for query "${query}":`, queryErr.message);
      testSummaryResults.push({
        queryIndex: i + 1,
        query,
        matchType: "ERROR",
        error: queryErr.message
      });
    }

    if (!SKIP_LLM && i < TEST_QUERIES.length - 1) {
      console.log("\nPausing 12s to respect Gemini API rate limits...");
      await new Promise(r => setTimeout(r, 12000));
    }
  }

  console.log("\n=================================================================");
  console.log(" SUMMARY OF ALL 12 RETRIEVAL TEST RESULTS ");
  console.log("=================================================================");
  testSummaryResults.forEach(res => {
    console.log(`Q${res.queryIndex}: "${res.query}" => Status: ${res.matchType} | Raw: ${res.rawCount || 0} | Dedup: ${res.dedupCount || 0} (Removed ${res.duplicatesRemoved || 0}) | Final: ${res.retrievedCount || 0}`);
  });
  console.log("=================================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

runMongoDBRagTests().catch(err => {
  console.error("Fatal error during MongoDB RAG tests:", err);
  process.exit(1);
});


