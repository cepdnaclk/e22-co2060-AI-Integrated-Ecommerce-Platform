import dotenv from "dotenv";
import mongoose from "mongoose";
import { handleChatMessage } from "../controllers/chatController.js";

dotenv.config();

/**
 * 🧪 Conversational RAG Test Suite (10 Multi-Turn Test Scenarios)
 */

const ENV_MONGO_URI = process.env.MONGO_URI || "";
const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const MONGO_URI = ENV_MONGO_URI.startsWith("mongodb+srv://") ? ENV_MONGO_URI : (process.env.ATLAS_MONGO_URI || ATLAS_FALLBACK_URI);

const CONVERSATIONAL_TESTS = [
  {
    id: 1,
    title: "TEST 1: Dependent Price Follow-up",
    turns: [
      { message: "Show me gaming laptops" },
      { message: "Which one is cheaper?" }
    ],
    evaluate: (res1, res2) => {
      const text2 = (res2.reply || "").toLowerCase();
      const sources2 = res2.sources || [];
      const getTitle = s => s.productName || s.title || "";
      const hasLaptop = sources2.some(s => /laptop|macbook|zephyrus|g14|g16|xps|dell|asus|rog|pc/i.test(getTitle(s)));
      const hasNonLaptop = sources2.some(s => /\b(book|books|t-shirt|vacuum|keyboard|clothing|shoe|shoes)\b/i.test(getTitle(s)));
      return {
        passed: res2.provider === "mongodb-atlas-rag" && hasLaptop && !hasNonLaptop,
        notes: `Provider: ${res2.provider}, Sources: ${sources2.map(getTitle).join(", ")}`
      };
    }
  },
  {
    id: 2,
    title: "TEST 2: Dependent Stock Follow-up",
    turns: [
      { message: "Show me Samsung phones" },
      { message: "Which one is in stock?" }
    ],
    evaluate: (res1, res2) => {
      const sources2 = res2.sources || [];
      const getTitle = s => s.productName || s.title || "";
      const isAllSamsungPhones = sources2.every(s => /samsung|galaxy/i.test(getTitle(s)));
      return {
        passed: res2.provider === "mongodb-atlas-rag" && sources2.length > 0 && isAllSamsungPhones,
        notes: `Provider: ${res2.provider}, Sources: ${sources2.map(getTitle).join(", ")}`
      };
    }
  },
  {
    id: 3,
    title: "TEST 3: Budget Follow-up",
    turns: [
      { message: "Show me laptops under 600000" },
      { message: "Show me cheaper ones" }
    ],
    evaluate: (res1, res2) => {
      const sources2 = res2.sources || [];
      const getTitle = s => s.productName || s.title || "";
      const hasLaptop = sources2.some(s => /laptop|macbook|zephyrus|g14|g16|xps|dell|asus|rog/i.test(getTitle(s)));
      const hasNonLaptop = sources2.some(s => /\b(book|books|t-shirt|vacuum|clothing)\b/i.test(getTitle(s)));
      return {
        passed: res2.provider === "mongodb-atlas-rag" && hasLaptop && !hasNonLaptop,
        notes: `Provider: ${res2.provider}, Sources: ${sources2.map(getTitle).join(", ")}`
      };
    }
  },
  {
    id: 4,
    title: "TEST 4: Brand Refinement Follow-up",
    turns: [
      { message: "I need a gaming laptop" },
      { message: "What about ASUS?" }
    ],
    evaluate: (res1, res2) => {
      const sources2 = res2.sources || [];
      const getTitle = s => s.productName || s.title || "";
      const isAsusGamingLaptop = sources2.every(s => /asus/i.test(getTitle(s)) && /laptop|zephyrus|g14|g16|rog/i.test(getTitle(s)));
      return {
        passed: res2.provider === "mongodb-atlas-rag" && sources2.length > 0 && isAsusGamingLaptop,
        notes: `Provider: ${res2.provider}, Sources: ${sources2.map(getTitle).join(", ")}`
      };
    }
  },
  {
    id: 5,
    title: "TEST 5: Explicit New Request (Topic Switch)",
    turns: [
      { message: "Show me gaming laptops" },
      { message: "Now show me Samsung phones" }
    ],
    evaluate: (res1, res2) => {
      const sources2 = res2.sources || [];
      const getTitle = s => s.productName || s.title || "";
      const hasPhones = sources2.some(s => /samsung|galaxy|phone/i.test(getTitle(s)));
      const hasLaptops = sources2.some(s => /laptop|zephyrus|macbook/i.test(getTitle(s)));
      return {
        passed: res2.provider === "mongodb-atlas-rag" && hasPhones && !hasLaptops,
        notes: `Provider: ${res2.provider}, Sources: ${sources2.map(getTitle).join(", ")}`
      };
    }
  },
  {
    id: 6,
    title: "TEST 6: Specific Model Price Inquiry in Context",
    turns: [
      { message: "Show me Samsung phones" },
      { message: "What is the price of the S25 Ultra?" }
    ],
    evaluate: (res1, res2) => {
      const text2 = (res2.reply || "").toLowerCase();
      const mentionsS25 = text2.includes("s25") || text2.includes("galaxy");
      return {
        passed: res2.provider === "mongodb-atlas-rag" && mentionsS25,
        notes: `Provider: ${res2.provider}, Reply snippet: ${res2.reply.slice(0, 100)}...`
      };
    }
  },
  {
    id: 7,
    title: "TEST 7: Stock Availability Follow-up",
    turns: [
      { message: "Show me gaming laptops" },
      { message: "Is it in stock?" }
    ],
    evaluate: (res1, res2) => {
      const text2 = (res2.reply || "").toLowerCase();
      const mentionsStockOrLaptop = text2.includes("stock") || text2.includes("available") || text2.includes("laptop");
      return {
        passed: res2.provider === "mongodb-atlas-rag" && mentionsStockOrLaptop,
        notes: `Provider: ${res2.provider}, Reply snippet: ${res2.reply.slice(0, 100)}...`
      };
    }
  },
  {
    id: 8,
    title: "TEST 8: Most Stock Comparison Follow-up",
    turns: [
      { message: "Show me laptops" },
      { message: "Which one has the most stock?" }
    ],
    evaluate: (res1, res2) => {
      const text2 = (res2.reply || "").toLowerCase();
      const sources2 = res2.sources || [];
      const hasLaptops = sources2.some(s => /laptop|macbook|zephyrus|g14|g16|xps|dell/i.test(s.title || ""));
      return {
        passed: res2.provider === "mongodb-atlas-rag" && (hasLaptops || text2.includes("stock")),
        notes: `Provider: ${res2.provider}, Sources: ${sources2.map(s => s.title).join(", ")}`
      };
    }
  },
  {
    id: 9,
    title: "TEST 9: Greeting Interruption",
    turns: [
      { message: "Show me gaming laptops" },
      { message: "Hello" }
    ],
    evaluate: (res1, res2) => {
      return {
        passed: res2.provider === "rule-greeting",
        notes: `Provider: ${res2.provider}`
      };
    }
  },
  {
    id: 10,
    title: "TEST 10: Store Policy Interruption",
    turns: [
      { message: "Show me Samsung phones" },
      { message: "Where do you deliver?" }
    ],
    evaluate: (res1, res2) => {
      return {
        passed: res2.provider === "rule-shipping",
        notes: `Provider: ${res2.provider}`
      };
    }
  }
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

async function runSingleTurn(message, history = []) {
  const req = { body: { currentMessage: message, history } };
  return new Promise((resolve) => {
    const resMock = createMockRes((code, body) => resolve({ code, body }));
    handleChatMessage(req, resMock);
  });
}

async function runConversationalTests() {
  console.log("=================================================================");
  console.log(" 🧪 STEP 10B: CONVERSATIONAL RAG 10-TEST SCENARIO SUITE ");
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

  let totalPassed = 0;

  for (const testCase of CONVERSATIONAL_TESTS) {
    console.log(`-----------------------------------------------------------------`);
    console.log(`[${testCase.title}]`);
    console.log(`-----------------------------------------------------------------`);

    const turn1Msg = testCase.turns[0].message;
    console.log(`TURN 1 User: "${turn1Msg}"`);
    const turn1Res = await runSingleTurn(turn1Msg, []);
    console.log(`TURN 1 Provider: ${turn1Res.body.provider || "N/A"}`);
    
    // Construct history for Turn 2
    const history = [
      { role: "user", text: turn1Msg },
      { role: "model", text: turn1Res.body.reply || "" }
    ];

    const turn2Msg = testCase.turns[1].message;
    console.log(`TURN 2 User: "${turn2Msg}"`);
    const turn2Res = await runSingleTurn(turn2Msg, history);
    console.log(`TURN 2 Provider: ${turn2Res.body.provider || "N/A"}`);
    if (turn2Res.body.sources && turn2Res.body.sources.length > 0) {
      console.log(`TURN 2 Sources: ${turn2Res.body.sources.map(s => s.title).join(" | ")}`);
    }

    console.log(`\nTURN 2 Reply Snippet:\n${(turn2Res.body.reply || "").slice(0, 150)}...\n`);

    const evalResult = testCase.evaluate(turn1Res.body, turn2Res.body);
    if (evalResult.passed) {
      console.log(`✅ EVALUATION: PASSED (${evalResult.notes})\n`);
      totalPassed++;
    } else {
      console.log(`❌ EVALUATION: FAILED (${evalResult.notes})\n`);
    }
  }

  console.log("=================================================================");
  console.log(`SUMMARY: ${totalPassed} / ${CONVERSATIONAL_TESTS.length} TESTS PASSED`);
  console.log("=================================================================");

  await mongoose.disconnect();
  process.exit(totalPassed === CONVERSATIONAL_TESTS.length ? 0 : 1);
}

runConversationalTests();
