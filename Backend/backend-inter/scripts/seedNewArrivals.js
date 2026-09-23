import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";
import sellerModel from "../models/seller.js";
import userModel from "../models/user.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

const SEED_PRODUCTS = [
  {
    productName: "Ray-Ban Meta Wayfarer Smart Glasses (Matte Black)",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Ray-Ban",
    description: "Matches your browsing interest in wearable technology and smart audio.",
    originalPrice: 110000,
    discount: 13,
    stockQty: 12
  },
  {
    productName: "Apple Watch Series 10 (46mm, Jet Black Aluminum)",
    image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Apple",
    description: "Fits your recent views of iOS accessories and Apple ecosystem products.",
    originalPrice: 155000,
    discount: 0,
    stockQty: 9
  },
  {
    productName: "DJI Neo Fly More Combo (Mini Selfie Drone)",
    image: "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&auto=format&fit=crop&q=80",
    category: "Gaming",
    brand: "DJI",
    description: "Top pick based on your interests in photography equipment and RC gadgets.",
    originalPrice: 130000,
    discount: 9,
    stockQty: 5
  },
  {
    productName: "Keychron Q1 Max QMK Mechanical Keyboard",
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=80",
    category: "Gaming",
    brand: "Keychron",
    description: "High match with your mechanical keyboard and programmer workspace preferences.",
    originalPrice: 75000,
    discount: 9,
    stockQty: 7
  },
  {
    productName: "Kindle Colorsoft Signature Edition (32GB, Color Screen)",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    category: "Books",
    brand: "Amazon",
    description: "Perfect addition based on your recent searches for e-readers and tablet screens.",
    originalPrice: 85000,
    discount: 0,
    stockQty: 15
  },
  {
    productName: "Dyson Airstrait Straightener (Prussian Blue/Rich Copper)",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80",
    category: "Beauty",
    brand: "Dyson",
    description: "Highly trending premium beauty care appliance in your locality.",
    originalPrice: 195000,
    discount: 7,
    stockQty: 4
  },
  {
    productName: "Patagonia Torrentshell 3L Waterproof Jacket",
    image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&auto=format&fit=crop&q=80",
    category: "Fashion",
    brand: "Patagonia",
    description: "Great price drop on outdoor clothing matching your trekking/adventure profile.",
    originalPrice: 65000,
    discount: 20,
    stockQty: 8
  },
  {
    productName: "Adidas Samba OG Core Black/White",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    category: "Sports",
    brand: "Adidas",
    description: "Matches your fashion style and interest in iconic classic footwear.",
    originalPrice: 36000,
    discount: 0,
    stockQty: 20
  },
  {
    productName: "Peak Design Everyday Backpack (Zip 20L, Midnight Blue)",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    category: "Accessories",
    brand: "Peak Design",
    description: "Matches your recent purchase of a premium laptop and tech accessory cases.",
    originalPrice: 98000,
    discount: 10,
    stockQty: 6
  },
  {
    productName: "SteelSeries Arctis Nova Pro Wireless Headset",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    category: "Gaming",
    brand: "SteelSeries",
    description: "Matches gaming headsets and surround-sound audio systems you viewed.",
    originalPrice: 125000,
    discount: 12,
    stockQty: 5
  },
  {
    productName: "Anker Prime 250W Power Bank (27,650mAh)",
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Anker",
    description: "Based on charging gear and portable power accessories in your cart.",
    originalPrice: 55000,
    discount: 12,
    stockQty: 14
  },
  {
    productName: "Theragun Prime Handheld Percussive Massager",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80",
    category: "Home",
    brand: "Theragun",
    description: "Recommended wellness gadget trending highly this month.",
    originalPrice: 110000,
    discount: 16,
    stockQty: 3
  }
];

async function seedNewArrivals() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  let demoUser = await userModel.findOne({ email: "demo@beeta.com" });
  if (!demoUser) {
    const hashedPassword = await bcrypt.hash("demo123", 10);
    demoUser = await userModel.create({
      email: "demo@beeta.com",
      firstName: "BEETA",
      lastName: "Demo",
      password: hashedPassword,
      role: "seller",
      isEmailVerified: true
    });
  }

  let demoSeller = await sellerModel.findOne({ userId: demoUser._id });
  if (!demoSeller) {
    demoSeller = await sellerModel.create({
      userId: demoUser._id,
      shopName: "BEETA Demo Store",
      description: "Official BEETA Demo Store.",
      address: "No 1, Galle Road, Colombo 03",
      phone: "+94770000000",
      verificationStatus: "approved",
      isActive: true,
    });
  }

  let created = 0;
  for (const seed of SEED_PRODUCTS) {
    const { discount, originalPrice, stockQty, ...productData } = seed;

    let product = await productModel.findOne({
      productName: { $regex: `^${productData.productName}$`, $options: "i" }
    });

    if (!product) {
      product = await productModel.create(productData);
      created++;
    }

    const offerExists = await sellerOfferModel.findOne({
      productId: product._id,
      sellerId: demoSeller._id,
    });

    if (!offerExists) {
      await sellerOfferModel.create({
        productId: product._id,
        sellerId: demoSeller._id,
        sellerName: demoSeller.shopName,
        price: originalPrice,
        stock: stockQty,
        discountPercentage: discount,
        warranty: "1 Year Manufacturer Warranty",
        isActive: true,
        deliveryOptions: ["Standard"],
        image: productData.image,
      });
    } else {
      await sellerOfferModel.findByIdAndUpdate(offerExists._id, {
        price: originalPrice,
        stock: stockQty,
        discountPercentage: discount,
        isActive: true,
      });
    }
  }

  console.log(`🎉 New Arrivals Seeding complete! Created ${created} products.`);
  await mongoose.disconnect();
}

seedNewArrivals().catch(console.error);
