import { GoogleGenAI } from "@google/genai";

/**
 * Generate a promotional Facebook caption for a product using the official @google/genai SDK.
 * Reads API key strictly from process.env.GEMINI_API_KEY.
 *
 * @param {Object} product
 * @param {string} product.productName
 * @param {string} product.category
 * @param {number|string} product.price
 * @param {string} product.description
 * @returns {Promise<string>}
 */
export async function generateFacebookCaption({ productName, category, price, description }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }

  // Initialize the official Google Gen AI SDK
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a professional social media marketing copywriter for an e-commerce platform.
Generate a short, engaging, and attractive Facebook promotional caption for the following product:

Product Name: ${productName}
Category: ${category}
Price: ${typeof price === "number" ? `Rs. ${price.toLocaleString()}` : price}
Description: ${description}

The caption MUST include:
1. An eye-catching headline with emojis
2. Main selling points based on the product description
3. Clear price display
4. A clear call to action (e.g. "Shop now!", "Order today!")
5. 3 to 5 relevant hashtags at the bottom

Format cleanly for a Facebook post. Do not include internal commentary.`;

  const model = "gemini-3.6-flash";
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Attempt ${attempt} for ${model} failed: ${err.message}`);
      if (attempt < 3) {
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }

  throw lastError || new Error(`Failed to generate caption using ${model}.`);
}
