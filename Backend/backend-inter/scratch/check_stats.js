import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function checkData() {
  const mongoURI = process.env.MONGO_URI;
  await mongoose.connect(mongoURI);
  
  const Product = mongoose.model("Product", new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));

  const productCount = await Product.countDocuments();
  const userCount = await User.countDocuments();

  console.log(`Database Stats:`);
  console.log(`- Products: ${productCount}`);
  console.log(`- Users: ${userCount}`);

  await mongoose.disconnect();
}

checkData();
