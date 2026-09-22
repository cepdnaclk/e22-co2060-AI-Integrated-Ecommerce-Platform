import mongoose from "mongoose";
import productModel from "./models/products.js";

const atlasUri = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const localUri = "mongodb://mongodb:27017/ecommerce";

async function checkAtlas() {
  try {
    console.log("Checking Atlas DB...");
    const conn = await mongoose.createConnection(atlasUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const Product = conn.model("Product", productModel.schema);
    const count = await Product.countDocuments();
    console.log("📊 Atlas DB Product Count:", count);
    await conn.close();
  } catch (err) {
    console.error("❌ Atlas Error:", err.message);
  }
}

async function checkLocal() {
  try {
    console.log("Checking Local Docker DB...");
    const conn = await mongoose.createConnection(localUri, { serverSelectionTimeoutMS: 5000 }).asPromise();
    const Product = conn.model("Product", productModel.schema);
    const count = await Product.countDocuments();
    console.log("📊 Local Docker DB Product Count:", count);
    await conn.close();
  } catch (err) {
    console.error("❌ Local DB Error:", err.message);
  }
}

async function main() {
  await checkAtlas();
  await checkLocal();
  process.exit(0);
}

main();
