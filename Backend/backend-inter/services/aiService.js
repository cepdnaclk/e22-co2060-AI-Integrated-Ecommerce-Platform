import axios from "axios";
import Product from "../models/products.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const sendProductsToAI = async () => {
  // Guard: do not attempt if AI_SERVICE_URL is not configured
  if (!process.env.AI_SERVICE_URL) {
    console.log("⚠️  AI_SERVICE_URL is not set — skipping AI sync.");
    return;
  }

  // 1️⃣ Fetch products from DB
  const products = await Product.find(
    { isAvailable: true },
    "productName sellerName howManyproductsSold"
  );

  // 2️⃣ Build keywords
  const keywords = products.map((p) => ({
    productId: p._id,
    keyword: `${p.sellerName} ${p.productName}`,
    soldCount: p.howManyproductsSold,
  }));

  console.log("🔹 Keywords being sent to AI:", keywords);

  // 3️⃣ Send to AI service with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await axios.post(
        `${process.env.AI_SERVICE_URL}/analyze`,
        { products: keywords },
        {
          headers: {
            "x-api-key": process.env.AI_SERVICE_KEY,
          },
          timeout: 10000, // 10 second timeout per request
        }
      );

      console.log("✅ Product keywords sent to AI service");
      return; // success — exit early
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1); // 1s, 2s, 4s

      if (isLastAttempt) {
        console.error(
          `❌ Failed to send products to AI after ${MAX_RETRIES} attempts:`,
          error.message
        );
      } else {
        console.warn(
          `⚠️  Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
      }
    }
  }
};
