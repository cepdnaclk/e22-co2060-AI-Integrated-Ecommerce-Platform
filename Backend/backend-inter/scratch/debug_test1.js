import dotenv from "dotenv";
import mongoose from "mongoose";
import { processMongoDbRagQuery } from "../services/mongodbRagService.js";

dotenv.config();

const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const MONGO_URI = process.env.MONGO_URI || ATLAS_FALLBACK_URI;

async function debugTest1() {
  await mongoose.connect(MONGO_URI);

  console.log("--- TURN 1 ---");
  const res1 = await processMongoDbRagQuery("Show me gaming laptops", { history: [] });
  console.log("Turn 1 MatchType:", res1.matchType);
  console.log("Turn 1 AppliedFilters:", res1.appliedFilters);
  console.log("Turn 1 Sources:", res1.sources.map(s => s.productName));

  const history = [
    { role: "user", text: "Show me gaming laptops" },
    { role: "model", text: res1.answer }
  ];

  console.log("\n--- TURN 2 ---");
  const res2 = await processMongoDbRagQuery("Which one is cheaper?", { history });
  console.log("Turn 2 ContextualizedQuery:", res2.contextualizedQuery);
  console.log("Turn 2 MatchType:", res2.matchType);
  console.log("Turn 2 AppliedFilters:", res2.appliedFilters);
  console.log("Turn 2 Sources:", res2.sources.map(s => s.productName));

  await mongoose.disconnect();
}

debugTest1();
