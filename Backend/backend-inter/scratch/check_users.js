import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function checkUsers() {
  const mongoURI = process.env.MONGO_URI;
  await mongoose.connect(mongoURI);
  
  const User = mongoose.model("User", new mongoose.Schema({
    email: String,
    role: String
  }));

  const users = await User.find({ role: { $in: ["admin", "ceo"] } });
  console.log("Admin Users in DB:");
  users.forEach(u => console.log(`- ${u.email} (${u.role})`));

  await mongoose.disconnect();
}

checkUsers();
