import dotenv from "dotenv";
import mongoose from "mongoose";
import { handleChatMessage } from "../controllers/chatController.js";

dotenv.config();

/**
 * 20-Query Chatbot Comprehensive Test Suite
 */

const ENV_MONGO_URI = process.env.MONGO_URI || "";
const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const MONGO_URI = ENV_MONGO_URI.startsWith("mongodb+srv://") ? ENV_MONGO_URI : (process.env.ATLAS_MONGO_URI || ATLAS_FALLBACK_URI);

const QUERIES_20 = [
  "Show me laptops",
  "I need a gaming laptop",
  "I need an ASUS gaming laptop",
  "Samsung phones under 500000",
  "A phone with a good camera",
  "Cheap gaming keyboards",
  "Products under 100000",
  "What laptops are in stock?",
  "I need comfortable clothes for sports",
  "Do you have Nike products?",
  "Show me something for gaming",
  "I need a laptop but my budget is 1000 LKR",
  "Do you have anything cheaper?",
  "Is the Samsung S25 Ultra available?",
  "What is the price of the Razer keyboard?",
  "What products are currently available?",
  "I want to buy something",
  "How do I return a product?",
  "Where do you deliver?",
  "Tell me about your products"
];

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

async function run20QueryTests() {
  console.log("=================================================================");
  console.log(" 20-QUERY CHATBOT COMPREHENSIVE VERIFICATION SUITE ");
  console.log("=================================================================");
  console.log(`TARGET DB: MONGODB ATLAS (${MONGO_URI.replace(/\/\/[^@]+@/, "//***:***@")})`);
  console.log("=================================================================\n");

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected to MongoDB Atlas\n");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }

  const results = [];

  for (let i = 0; i < QUERIES_20.length; i++) {
    const query = QUERIES_20[i];
    console.log(`\n-----------------------------------------------------------------`);
    console.log(`QUERY [${i + 1}/20]: "${query}"`);
    console.log(`-----------------------------------------------------------------`);

    try {
      const req = { body: { currentMessage: query, history: [] } };
      const startTime = Date.now();

      const responsePromise = new Promise((resolve) => {
        const resMock = createMockRes((code, body) => resolve({ code, body }));
        handleChatMessage(req, resMock);
      });

      const { code, body } = await responsePromise;
      const durationMs = Date.now() - startTime;

      console.log(`HTTP Status: ${code}`);
      console.log(`Provider: ${body.provider || "N/A"}`);
      if (body.matchType) console.log(`Match Status: ${body.matchType}`);
      console.log(`Sources Count: ${Array.isArray(body.sources) ? body.sources.length : 0}`);
      console.log(`Duration: ${durationMs} ms`);

      console.log("\n--- ANSWER SNIPPET ---");
      const answerSnippet = (body.reply || body.error || "").split("\n").slice(0, 8).join("\n");
      console.log(answerSnippet);

      results.push({
        qIndex: i + 1,
        query,
        provider: body.provider || "N/A",
        status: body.matchType || "OK",
        sources: Array.isArray(body.sources) ? body.sources.length : 0,
        httpCode: code
      });

    } catch (err) {
      console.error(`❌ Error on query "${query}":`, err.message);
      results.push({ qIndex: i + 1, query, provider: "ERROR", error: err.message });
    }

    if (i < QUERIES_20.length - 1) {
      await new Promise(r => setTimeout(r, 8000));
    }
  }

  console.log("\n=================================================================");
  console.log(" SUMMARY OF ALL 20 TEST RESULTS ");
  console.log("=================================================================");
  results.forEach(r => {
    console.log(`Q${r.qIndex}: "${r.query}" => Provider: ${r.provider} | Match: ${r.status} | Sources: ${r.sources}`);
  });
  console.log("=================================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

run20QueryTests().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
