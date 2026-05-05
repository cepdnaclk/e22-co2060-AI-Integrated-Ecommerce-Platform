import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userModel from '../models/user.js';
import productModel from '../models/products.js';
import sellerOfferModel from '../models/sellerOffer.js';

dotenv.config();

const LOCAL_URI = "mongodb://localhost:27018/ecommerce";
const ATLAS_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority&connectTimeoutMS=10000";

async function migrate() {
    try {
        console.log("🚀 Starting Migration...");

        // Connect to Local
        const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log("✅ Connected to Local MongoDB");

        // Connect to Atlas
        const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
        console.log("✅ Connected to MongoDB Atlas");

        const collections = [
            { name: 'Users', modelName: 'User', schema: userModel.schema },
            { name: 'Products', modelName: 'Product', schema: productModel.schema },
            { name: 'SellerOffers', modelName: 'SellerOffer', schema: sellerOfferModel.schema }
        ];

        for (const col of collections) {
            console.log(`📦 Migrating ${col.name}...`);
            const LocalModel = localConn.model(col.modelName, col.schema);
            const AtlasModel = atlasConn.model(col.modelName, col.schema);

            const data = await LocalModel.find({}).lean();
            console.log(`🔍 Found ${data.length} items in ${col.name}`);

            if (data.length > 0) {
                try {
                    await AtlasModel.collection.insertMany(data, { ordered: false });
                    console.log(`✅ Successfully migrated ${col.name}`);
                } catch (err) {
                    if (err.code === 11000) {
                        console.log(`ℹ️ Some items in ${col.name} already exist in Atlas, skipping duplicates.`);
                    } else {
                        throw err;
                    }
                }
            }
        }

        console.log("✨ Migration Complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    }
}

migrate();
