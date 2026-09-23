/**
 * seedDealProducts.js
 * ───────────────────────────────────────────────────────────────────────────
 * Seeder: Creates realistic Products + SellerOffers with discountPercentage > 0
 * in MongoDB so the Deals page has real data to display.
 *
 * Usage (from backend-inter directory):
 *   node scripts/seedDealProducts.js
 *
 * Requires MONGO_URI in .env or environment. Uses the EXISTING Product and
 * SellerOffer schemas — does NOT modify any schema.
 * ───────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import bcrypt from "bcryptjs";

// Load .env from backend root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Import existing models (DO NOT create new models)
import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";
import sellerModel from "../models/seller.js";
import userModel from "../models/user.js";

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

// ── Seed data definitions ──────────────────────────────────────────────────
const SEED_PRODUCTS = [
  {
    productName: "ASUS ROG Zephyrus G16 Gaming Laptop",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "ASUS",
    description: "AMD Ryzen 9 processor, NVIDIA RTX 4080, 32GB RAM, 1TB NVMe SSD, 165Hz QHD display. Built for pro gaming and content creation.",
    specs: {
      processor: "AMD Ryzen 9 7945HX",
      gpu: "NVIDIA RTX 4080",
      ram: "32GB DDR5",
      storage: "1TB PCIe 4.0 NVMe",
      display: "16-inch QHD 165Hz",
      battery: "90Wh",
      os: "Windows 11 Home"
    },
    howManyProductsSold: 214,
    discount: 20,
    originalPrice: 580000,
    stockQty: 8
  },
  {
    productName: "Samsung Galaxy S25 Ultra (512GB, Titanium Gray)",
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Samsung",
    description: "Snapdragon 8 Elite, 200MP quad camera system, 5000mAh battery, built-in S Pen, 6.9-inch Dynamic AMOLED 2X 120Hz display.",
    specs: {
      processor: "Snapdragon 8 Elite",
      camera: "200MP + 50MP + 10MP + 12MP",
      battery: "5000mAh",
      display: "6.9-inch Dynamic AMOLED 2X 120Hz",
      storage: "512GB",
      ram: "12GB",
      os: "Android 15 / OneUI 7"
    },
    howManyProductsSold: 512,
    discount: 15,
    originalPrice: 290000,
    stockQty: 18
  },
  {
    productName: "Sony WH-1000XM6 Wireless Noise Canceling Headphones",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Sony",
    description: "Industry-leading noise cancellation with HD sound. 30-hour battery, multipoint connection, speak-to-chat, and foldable design.",
    specs: {
      driverUnit: "30mm",
      frequencyResponse: "4 Hz – 40 kHz",
      battery: "30 hours",
      bluetooth: "5.3",
      noiseCancellation: "Advanced 8-mic array",
      weight: "250g"
    },
    howManyProductsSold: 924,
    discount: 30,
    originalPrice: 125000,
    stockQty: 22
  },
  {
    productName: "Apple AirPods Pro 2nd Gen (USB-C, Active Noise Cancellation)",
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Apple",
    description: "Up to 2x more noise cancellation, Adaptive Audio, Personalized Spatial Audio, and H2 chip for seamless Apple ecosystem integration.",
    specs: {
      chip: "H2",
      battery: "6 hours (ANC on) + 30 hours with case",
      noiseCancellation: "2x active noise cancellation",
      waterResistance: "IPX4",
      connectivity: "Bluetooth 5.3",
      chargingPort: "USB-C / MagSafe"
    },
    howManyProductsSold: 820,
    discount: 18,
    originalPrice: 92000,
    stockQty: 35
  },
  {
    productName: "Logitech MX Master 3S Wireless Mouse",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Logitech",
    description: "8K DPI sensor, ultra-fast MagSpeed scroll wheel, ergonomic design for all-day comfort. Works on any surface including glass.",
    specs: {
      sensor: "8000 DPI optical",
      battery: "70 days per charge",
      connectivity: "Bluetooth 5 / USB-A receiver",
      buttons: "7 programmable",
      scroll: "MagSpeed electromagnetic",
      weight: "141g"
    },
    howManyProductsSold: 480,
    discount: 25,
    originalPrice: 38000,
    stockQty: 45
  },
  {
    productName: "Keychron Q1 Pro Wireless Mechanical Keyboard (Full Aluminum)",
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Keychron",
    description: "Full aluminum CNC body, QMK/VIA support, Gateron G Pro 3.0 switches, RGB backlight, hot-swappable, Bluetooth 5.1.",
    specs: {
      layout: "75% (84 keys)",
      switches: "Gateron G Pro 3.0 Red",
      connectivity: "Bluetooth 5.1 / USB-C",
      backlight: "RGB per-key",
      battery: "4000mAh",
      body: "CNC Aluminum"
    },
    howManyProductsSold: 162,
    discount: 22,
    originalPrice: 75000,
    stockQty: 14
  },
  {
    productName: "Razer DeathAdder V3 HyperSpeed Gaming Mouse",
    image: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=600&auto=format&fit=crop&q=80",
    category: "Gaming",
    brand: "Razer",
    description: "Focus Pro 30K DPI optical sensor, HyperSpeed wireless technology (4x faster than competing wireless), asymmetric ergonomic design.",
    specs: {
      sensor: "Focus Pro 30K DPI",
      connectivity: "HyperSpeed Wireless / USB-C",
      battery: "90 hours",
      weight: "64g",
      buttons: "6",
      clicks: "90 million click lifespan"
    },
    howManyProductsSold: 388,
    discount: 28,
    originalPrice: 52000,
    stockQty: 27
  },
  {
    productName: "LG UltraGear 27GP850-B 27\" IPS 165Hz Gaming Monitor",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80",
    category: "Gaming",
    brand: "LG",
    description: "27-inch Nano IPS display, 165Hz refresh rate, 1ms GtG response, NVIDIA G-Sync compatible, HDR400, sRGB 98%.",
    specs: {
      panel: "Nano IPS",
      resolution: "2560x1440 QHD",
      refreshRate: "165Hz",
      responseTime: "1ms GtG",
      hdr: "VESA DisplayHDR 400",
      ports: "2x HDMI 2.0, 1x DP 1.4, 2x USB 3.0"
    },
    howManyProductsSold: 278,
    discount: 35,
    originalPrice: 210000,
    stockQty: 11
  },
  {
    productName: "Apple iPad Pro 13\" M4 Chip (Wi-Fi, 256GB, Space Black)",
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Apple",
    description: "Thinnest Apple product ever. Ultra Retina XDR OLED tandem display, M4 chip, 10-core CPU, Apple Pencil Pro compatible.",
    specs: {
      chip: "Apple M4 (10-core CPU, 10-core GPU)",
      display: "13-inch Ultra Retina XDR OLED Tandem",
      storage: "256GB",
      camera: "12MP Wide + 12MP ultrawide",
      battery: "10 hours",
      connectivity: "Wi-Fi 6E, Bluetooth 5.3, USB-C Thunderbolt 4"
    },
    howManyProductsSold: 145,
    discount: 12,
    originalPrice: 480000,
    stockQty: 9
  },
  {
    productName: "Samsung Galaxy Watch 7 (44mm, Cream)",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Samsung",
    description: "Advanced health tracking with BioActive Sensor 3.0, sleep coaching, Google Wear OS 5, 40-hour battery life, sapphire crystal glass.",
    specs: {
      display: "1.47-inch Super AMOLED",
      processor: "Exynos W1000",
      battery: "40 hours (typical)",
      sensors: "BioActive 3.0 (heart rate, SpO2, ECG, BIA)",
      waterResistance: "5ATM + IP68 + MIL-STD-810H",
      os: "Wear OS 5 / One UI Watch 6"
    },
    howManyProductsSold: 310,
    discount: 20,
    originalPrice: 115000,
    stockQty: 16
  },
  {
    productName: "Anker Soundcore Space Q45 Wireless ANC Headphones",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Anker",
    description: "Adaptive noise cancellation with 4 levels, Hi-Res Audio certified, 50-hour battery, multipoint connection for 2 devices.",
    specs: {
      noiseCancellation: "4-level adaptive ANC",
      battery: "50 hours",
      bluetooth: "5.3",
      audio: "Hi-Res Audio certified",
      driverSize: "40mm",
      charging: "USB-C fast charge (5 min = 4 hours)"
    },
    howManyProductsSold: 540,
    discount: 40,
    originalPrice: 42000,
    stockQty: 32
  },
  {
    productName: "Xiaomi Redmi Note 14 Pro+ 5G (256GB, Midnight Black)",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    category: "Electronics",
    brand: "Xiaomi",
    description: "Dimensity 9300, 200MP LYTIA camera, 6.67-inch AMOLED 144Hz, 90W HyperCharge, 5000mAh battery, IP68 water resistance.",
    specs: {
      processor: "Dimensity 9300",
      camera: "200MP LYTIA + 8MP ultrawide + 2MP macro",
      display: "6.67-inch AMOLED 144Hz",
      battery: "5000mAh with 90W HyperCharge",
      storage: "256GB",
      os: "MIUI 15 / Android 14"
    },
    howManyProductsSold: 680,
    discount: 15,
    originalPrice: 145000,
    stockQty: 41
  }
];

// ── Seed Execution ─────────────────────────────────────────────────────────
async function seedDeals() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // 1. Find or create user with role "seller"
  let demoUser = await userModel.findOne({ email: "demo@beeta.com" });
  if (!demoUser) {
    console.log("ℹ️  Creating user with role seller...");
    const hashedPassword = await bcrypt.hash("demo123", 10);
    demoUser = await userModel.create({
      email: "demo@beeta.com",
      firstName: "BEETA",
      lastName: "Demo",
      password: hashedPassword,
      role: "seller",
      isEmailVerified: true
    });
    console.log(`   ↳ User created: ${demoUser.email} (${demoUser._id})`);
  }

  // 2. Find or create a Seller profile linked to this User
  let demoSeller = await sellerModel.findOne({ userId: demoUser._id });
  if (!demoSeller) {
    console.log("ℹ️  Creating Seller profile...");
    demoSeller = await sellerModel.create({
      userId: demoUser._id,
      shopName: "BEETA Demo Store",
      description: "Official BEETA Demo Store showcasing verified promotional offers.",
      address: "No 1, Galle Road, Colombo 03",
      phone: "+94770000000",
      verificationStatus: "approved",
      isActive: true,
    });
    console.log(`✅ Created seller profile: ${demoSeller.shopName} (${demoSeller._id})`);
  } else {
    console.log(`ℹ️  Using existing seller profile: ${demoSeller.shopName} (${demoSeller._id})`);
  }

  let created = 0;
  let skipped = 0;

  for (const seed of SEED_PRODUCTS) {
    const { discount, originalPrice, stockQty, ...productData } = seed;

    // ── Check if product already exists (by name) ──
    const existing = await productModel.findOne({
      productName: { $regex: `^${productData.productName}$`, $options: "i" }
    });

    let product = existing;
    if (existing) {
      console.log(`⏭️  Skipped (already exists): ${productData.productName}`);
      skipped++;
    } else {
      product = await productModel.create(productData);
      console.log(`✅ Created product: ${product.productName} (${product._id})`);
      created++;
    }

    // ── Upsert a SellerOffer with discountPercentage ──
    const offerExists = await sellerOfferModel.findOne({
      productId: product._id,
      sellerId: demoSeller._id,
    });

    if (!offerExists) {
      await sellerOfferModel.create({
        productId: product._id,
        sellerId: demoSeller._id,
        sellerName: demoSeller.shopName, // Using the correct shopName field
        price: originalPrice,
        stock: stockQty,
        discountPercentage: discount,
        warranty: "1 Year Manufacturer Warranty",
        isActive: true,
        deliveryOptions: ["Standard", "Express"],
        image: productData.image,
      });
      console.log(`   ↳ Created offer: Rs.${originalPrice} with ${discount}% discount`);
    } else {
      // Update the existing offer to ensure it has discount
      await sellerOfferModel.findByIdAndUpdate(offerExists._id, {
        price: originalPrice,
        stock: stockQty,
        discountPercentage: discount,
        isActive: true,
      });
      console.log(`   ↳ Updated existing offer: ${discount}% discount`);
    }
  }

  console.log("\n══════════════════════════════════════");
  console.log(`🎉 Seeding complete!`);
  console.log(`   Products created : ${created}`);
  console.log(`   Products skipped : ${skipped}`);
  console.log(`   Total offers set : ${SEED_PRODUCTS.length}`);
  console.log("══════════════════════════════════════");

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB");
  process.exit(0);
}

seedDeals().catch((err) => {
  console.error("❌ Seeding failed:", err.message);
  process.exit(1);
});
