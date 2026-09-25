import dotenv from "dotenv";
import mongoose from "mongoose";
import { handleChatMessage } from "../controllers/chatController.js";

dotenv.config();

/**
 * Integrated Chatbot Test Suite (STEP 8 Verification)
 * 
 * Tests the 10 required queries through the main handleChatMessage controller:
 * 1. "I need a powerful gaming keyboard" (MongoDB Atlas RAG)
 * 2. "I want a smartphone with a good camera" (MongoDB Atlas RAG)
 * 3. "Show me a gaming laptop under 600000 LKR" (MongoDB Atlas RAG)
 * 4. "Show me a Samsung phone" (MongoDB Atlas RAG)
 * 5. "Show me a laptop under 1000 LKR" (MongoDB Atlas RAG - ALTERNATIVE_ONLY)
 * 6. "I need a product that is currently in stock" (MongoDB Atlas RAG)
 * 7. "hello" (Rule Greeting)
 * 8. "How can I order a product?" (General AI / Policy)
 * 9. "What products do you sell?" (Latest / RAG)
 * 10. "comfortable sports clothing" (MongoDB Atlas RAG)
 * 
 * Usage:
 *   docker compose run --rm backend node scripts/testIntegratedChat.js
 */

const ENV_MONGO_URI = process.env.MONGO_URI || "";
const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const MONGO_URI = ENV_MONGO_URI.startsWith("mongodb+srv://") ? ENV_MONGO_URI : (process.env.ATLAS_MONGO_URI || ATLAS_FALLBACK_URI);

const INTEGRATION_TEST_QUERIES = [
  "I need a powerful gaming keyboard",
  "I want a smartphone with a good camera",
  "Show me a gaming laptop under 600000 LKR",
  "Show me a Samsung phone",
  "Show me a laptop under 1000 LKR",
  "I need a product that is currently in stock",
  "hello",
  "How can I order a product?",
  "What products do you sell?",
  "comfortable sports clothing"
];

// Helper mock res object for Express handler
function createMockRes(onComplete) {
  let statusCode = 200;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      onComplete(statusCode, body);
    }
  };
}

async function runIntegratedChatTests() {
  console.log("=================================================================");
  console.log(" INTEGRATED CHATBOT END-TO-END TEST SUITE (STEP 8 VERIFICATION) ");
  console.log("=================================================================");
  console.log(`TARGET DB: MONGODB ATLAS (${MONGO_URI.replace(/\/\/[^@]+@/, "//***:***@")})`);
  console.log(`TOTAL TEST QUERIES: ${INTEGRATION_TEST_QUERIES.length}`);
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

  for (let i = 0; i < INTEGRATION_TEST_QUERIES.length; i++) {
    const query = INTEGRATION_TEST_QUERIES[i];
    console.log(`\n=================================================================`);
    console.log(`INTEGRATION TEST [${i + 1}/${INTEGRATION_TEST_QUERIES.length}]: "${query}"`);
    console.log(`=================================================================`);

    try {
      const req = { body: { currentMessage: query, history: [] } };
      const startTime = Date.now();

      const responsePromise = new Promise((resolve) => {
        const resMock = createMockRes((code, body) => resolve({ code, body }));
        handleChatMessage(req, resMock);
      });

      const { code, body } = await responsePromise;
      const durationMs = Date.now() - startTime;

      console.log(`📌 Query: "${query}"`);
      console.log(`HTTP Status: ${code}`);
      console.log(`🤖 Response Provider: ${body.provider || "N/A"}`);
      if (body.matchType) console.log(`🏷️ Match Status: ${body.matchType}`);
      console.log(`⏱️ Duration: ${durationMs} ms`);
      console.log(`📦 Sources Count: ${Array.isArray(body.sources) ? body.sources.length : 0}`);

      console.log("\n--- CHATBOT REPLY ---");
      console.log(body.reply || body.error || "No response text");
      console.log("-----------------------------------------------------------------");

      testSummaryResults.push({
        queryIndex: i + 1,
        query,
        provider: body.provider || "N/A",
        matchType: body.matchType || "N/A",
        sourcesCount: Array.isArray(body.sources) ? body.sources.length : 0,
        statusCode: code
      });

    } catch (queryErr) {
      console.error(`❌ Error executing integrated chat for query "${query}":`, queryErr.message);
      testSummaryResults.push({
        queryIndex: i + 1,
        query,
        provider: "ERROR",
        error: queryErr.message
      });
    }

    if (i < INTEGRATION_TEST_QUERIES.length - 1) {
      console.log("\nPausing 12s to respect Gemini API rate limits...");
      await new Promise(r => setTimeout(r, 12000));
    }
  }

  console.log("\n=================================================================");
  console.log(" SUMMARY OF ALL 10 INTEGRATED CHAT TEST RESULTS ");
  console.log("=================================================================");
  testSummaryResults.forEach(res => {
    console.log(`Q${res.queryIndex}: "${res.query}" => Provider: ${res.provider} | Status: ${res.matchType} | Sources: ${res.sourcesCount}`);
  });
  console.log("=================================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

runIntegratedChatTests().catch(err => {
  console.error("Fatal error during integrated chat tests:", err);
  process.exit(1);
});
