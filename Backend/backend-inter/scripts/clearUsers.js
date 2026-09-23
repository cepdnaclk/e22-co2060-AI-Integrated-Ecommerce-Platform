import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const ATLAS_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

async function clearUsers() {
    try {
        console.log("🧹 Clearing ghost users from Atlas...");
        await mongoose.connect(ATLAS_URI);
        console.log("✅ Connected to Atlas");

        const result = await mongoose.connection.collection('users').deleteMany({});
        console.log(`✅ Removed ${result.deletedCount} old users. Products were NOT touched.`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Failed to clear users:", err.message);
        process.exit(1);
    }
}

clearUsers();
