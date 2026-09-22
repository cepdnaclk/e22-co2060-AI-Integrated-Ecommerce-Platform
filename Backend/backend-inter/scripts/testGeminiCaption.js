import dotenv from "dotenv";
import { generateFacebookCaption } from "../services/facebookCaptionService.js";

dotenv.config();

async function runTest() {
  console.log("==========================================");
  console.log("🚀 Testing Gemini AI Facebook Caption Generation");
  console.log("==========================================");

  const testProduct = {
    productName: "Samsung Galaxy S25 Ultra",
    category: "Mobile Phone",
    price: "Rs. 349,000",
    description: "Latest Samsung flagship smartphone with powerful performance and an advanced camera system."
  };

  try {
    const caption = await generateFacebookCaption(testProduct);
    console.log("\n✅ SUCCESS! Generated Facebook Caption:\n");
    console.log("------------------------------------------");
    console.log(caption);
    console.log("------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ FAILED to generate caption:", error.message);
    process.exit(1);
  }
}

runTest();
