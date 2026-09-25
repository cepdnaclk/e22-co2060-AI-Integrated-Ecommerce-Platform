import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";
const MONGO_URI = process.env.MONGO_URI || ATLAS_FALLBACK_URI;

async function checkMongoQuery() {
  await mongoose.connect(MONGO_URI);
  const collection = mongoose.connection.db.collection("products");

  const rawPattern = /\b(laptop|macbook|zephyrus|g14|g16|xps|thinkpad)\b/i;
  const strPattern = rawPattern.source.replace(/\\b/g, '');

  console.log(`Clean strPattern: "${strPattern}"`);

  const directCandidates = await collection.find({
    $or: [
      { category: { $regex: strPattern, $options: "i" } },
      { productName: { $regex: strPattern, $options: "i" } }
    ]
  }).toArray();

  console.log(`\nFound ${directCandidates.length} direct candidates:`);
  directCandidates.forEach(p => {
    console.log(`- ID: ${p._id} | Name: "${p.productName}" | MinPrice: ${p.minPrice}`);
  });

  await mongoose.disconnect();
}

checkMongoQuery();
