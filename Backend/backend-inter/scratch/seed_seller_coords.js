import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config();

async function seedSellerCoords() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    const sellerSchema = new mongoose.Schema({}, { strict: false });
    const Seller = mongoose.model('Seller_Seed', sellerSchema, 'sellers');
    
    // Peradeniya/Kandy coords for these sellers
    const coords = { lat: 7.2650, lng: 80.5980 }; 

    await Seller.updateMany({}, { $set: { addressLocation: { ...coords, city: "Kandy", formattedAddress: "Panideniya, Kandy" } } });
    console.log("Updated all sellers with Kandy coordinates");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedSellerCoords();
