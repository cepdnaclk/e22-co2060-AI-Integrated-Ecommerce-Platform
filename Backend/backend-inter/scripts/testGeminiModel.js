import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("Testing Gemini API Key (masked):", apiKey ? apiKey.substring(0, 6) + "..." : "MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const candidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash"];

  for (const model of candidates) {
    try {
      console.log(`\nTesting model: ${model}`);
      const res = await ai.models.generateContent({
        model,
        contents: "Say Hello in 3 words"
      });
      console.log(`✅ ${model} SUCCESS:`, res.text.trim());
      return model;
    } catch (err) {
      console.log(`❌ ${model} FAILED:`, err.message);
    }
  }
}

testModels();
