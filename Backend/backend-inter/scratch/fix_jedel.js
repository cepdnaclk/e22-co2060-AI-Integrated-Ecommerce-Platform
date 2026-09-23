import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoURI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";

async function fixJedel() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to DB");
        
        const result = await mongoose.connection.db.collection('products').updateOne(
            { productName: /Jedel WD-155/i },
            { $set: { image: "https://jedel.com.cn/upload/product/20211124/1637736633.jpg" } }
        );
        
        console.log("Update result:", result);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixJedel();
