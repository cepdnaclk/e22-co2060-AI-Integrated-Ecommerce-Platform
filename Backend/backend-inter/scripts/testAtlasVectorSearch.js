import dotenv from "dotenv";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

/**
 * MongoDB Atlas Vector Search Retrieval Test Script
 * 
 * Usage:
 *   docker compose run --rm backend node scripts/testAtlasVectorSearch.js
 */

// Determine URI: if MONGO_URI is Atlas (mongodb+srv), use it; otherwise use ATLAS_MONGO_URI or fallback Atlas URI
const ENV_MONGO_URI = process.env.MONGO_URI || "";
const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const MONGO_URI = ENV_MONGO_URI.startsWith("mongodb+srv://") ? ENV_MONGO_URI : (process.env.ATLAS_MONGO_URI || ATLAS_FALLBACK_URI);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-embedding-2";
const REQUIRED_DIMENSIONS = 768;
const INDEX_NAME = "vector_index";

const TEST_QUERIES = [
  "I need a powerful gaming keyboard",
  "I want a smartphone with a good camera",
  "comfortable sports clothing",
  "laptop suitable for gaming",
  "home appliance for cleaning"
];

/**
 * Generates a 768-dimensional query embedding using Gemini SDK.
 * 
 * @param {Object} ai GoogleGenerativeAI instance
 * @param {String} queryText User search query
 * @returns {Array} 768-dimensional float array
 */
async function generateQueryEmbedding(ai, queryText) {
  try {
    let model;
    let result;

    try {
      model = ai.getGenerativeModel({ model: MODEL_NAME });
      result = await model.embedContent({
        content: { parts: [{ text: queryText }] },
        outputDimensionality: REQUIRED_DIMENSIONS
      });
    } catch (err1) {
      if (err1.message.includes("404") || err1.message.includes("not found")) {
        model = ai.getGenerativeModel({ model: `models/${MODEL_NAME}` });
        result = await model.embedContent({
          content: { parts: [{ text: queryText }] },
          outputDimensionality: REQUIRED_DIMENSIONS
        });
      } else {
        throw err1;
      }
    }

    const vector = result && result.embedding ? result.embedding.values : null;

    if (!Array.isArray(vector) || vector.length !== REQUIRED_DIMENSIONS) {
      throw new Error(`Invalid embedding vector dimension returned: ${vector ? vector.length : "null"}`);
    }

    const isValidNums = vector.every(v => typeof v === "number" && !isNaN(v) && isFinite(v));
    if (!isValidNums) {
      throw new Error("Vector contains invalid non-numeric or NaN values");
    }

    return vector;
  } catch (err) {
    throw new Error(`Gemini Embedding Generation Failed: ${err.message}`);
  }
}

/**
 * Executes a $vectorSearch aggregation query against MongoDB Atlas.
 * 
 * @param {Object} collection MongoDB collection reference
 * @param {Array} queryVector 768-dim float vector
 * @param {Number} limit Number of top results to retrieve (default 5)
 * @returns {Array} Array of top matching product documents with search score
 */
async function performVectorSearch(collection, queryVector, limit = 5) {
  const pipeline = [
    {
      $vectorSearch: {
        index: INDEX_NAME,
        path: "embedding",
        queryVector: queryVector,
        numCandidates: limit * 10,
        limit: limit
      }
    },
    {
      $project: {
        productName: 1,
        brand: 1,
        category: 1,
        minPrice: 1,
        maxPrice: 1,
        totalStock: 1,
        hasActiveOffers: 1,
        approvalStatus: 1,
        vectorSearchScore: { $meta: "vectorSearchScore" }
      }
    }
  ];

  try {
    return await collection.aggregate(pipeline).toArray();
  } catch (err) {
    throw new Error(`MongoDB $vectorSearch Aggregation Failed: ${err.message}`);
  }
}

async function main() {
  console.log("=========================================");
  console.log(" MONGODB ATLAS VECTOR SEARCH RETRIEVAL TEST ");
  console.log("=========================================");
  console.log(`MODEL: ${MODEL_NAME}`);
  console.log(`DIMENSIONS: ${REQUIRED_DIMENSIONS}`);
  console.log(`INDEX: ${INDEX_NAME}`);
  console.log(`TARGET DB: MONGODB ATLAS (${MONGO_URI.replace(/\/\/[^@]+@/, "//***:***@")})`);
  console.log("=========================================\n");

  if (!GEMINI_API_KEY) {
    console.error("❌ ERROR: GEMINI_API_KEY is not configured in backend environment!");
    process.exit(1);
  }

  let conn;
  try {
    console.log("Connecting to MongoDB Atlas...");
    conn = await mongoose.createConnection(MONGO_URI, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }

  const db = conn.db;
  const productsColl = db.collection("products");

  // Verify vector index status
  try {
    const indexes = await productsColl.listSearchIndexes().toArray();
    const vecIdx = indexes.find(i => i.name === INDEX_NAME);
    if (!vecIdx || vecIdx.queryable !== true) {
      console.warn(`⚠️ WARNING: Vector index '${INDEX_NAME}' may not be queryable. Status: ${vecIdx ? vecIdx.status : "NOT FOUND"}`);
    } else {
      console.log(`✅ Vector Index '${INDEX_NAME}' verified READY and QUERYABLE.`);
    }
  } catch (idxErr) {
    console.warn("Could not list search indexes:", idxErr.message);
  }

  const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

  // Execute queries
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];
    console.log(`\n=========================================`);
    console.log(`QUERY [${i + 1}/${TEST_QUERIES.length}]: "${query}"`);
    console.log(`=========================================`);

    try {
      // 1. Generate Query Embedding
      const queryVector = await generateQueryEmbedding(ai, query);
      console.log(`Generated embedding dimensions: ${queryVector.length}`);

      // 2. Perform Vector Search
      const results = await performVectorSearch(productsColl, queryVector, 5);

      console.log(`\nTop ${results.length} Vector Search Results:`);
      console.log("-----------------------------------------");

      if (results.length === 0) {
        console.log("No vector search matches found.");
      } else {
        results.forEach((prod, rank) => {
          const priceText = prod.minPrice !== null 
            ? (prod.minPrice === prod.maxPrice ? `LKR ${prod.minPrice.toLocaleString()}` : `LKR ${prod.minPrice.toLocaleString()} - LKR ${prod.maxPrice.toLocaleString()}`)
            : "No active offers";

          console.log(`${rank + 1}. Product Name:    ${prod.productName}`);
          console.log(`   Brand:           ${prod.brand || "N/A"}`);
          console.log(`   Category:        ${prod.category || "N/A"}`);
          console.log(`   Price:           ${priceText}`);
          console.log(`   Stock:           ${prod.totalStock} (Active Offers: ${prod.hasActiveOffers ? "Yes" : "No"})`);
          console.log(`   Approval Status: ${prod.approvalStatus || "N/A"}`);
          console.log(`   Search Score:    ${prod.vectorSearchScore ? prod.vectorSearchScore.toFixed(4) : "N/A"}`);
          console.log("-----------------------------------------");
        });
      }

    } catch (err) {
      console.error(`❌ Error processing query "${query}":`, err.message);
    }
  }

  console.log("\n=========================================");
  console.log(" VECTOR SEARCH TEST SUITE COMPLETED ");
  console.log("=========================================");

  await conn.close();
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error during vector search test:", err);
  process.exit(1);
});
