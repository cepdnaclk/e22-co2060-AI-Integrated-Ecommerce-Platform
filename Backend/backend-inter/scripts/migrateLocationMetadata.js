import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user.js";
import Order from "../models/order.js";

dotenv.config();

function fallbackFormattedAddress(location = {}, fallback = "") {
  return (
    location.formattedAddress ||
    [location.street, location.city, location.state, location.country].filter(Boolean).join(", ") ||
    fallback ||
    ""
  );
}

function normalizeLocation(location = {}, fallbackAddress = "") {
  const normalized = { ...location };
  normalized.provider = normalized.provider || (normalized.placeId ? "google-legacy" : "osm");
  normalized.accuracy = Number.isFinite(Number(normalized.accuracy)) ? Number(normalized.accuracy) : null;
  normalized.timestamp = normalized.timestamp || "";
  normalized.country = normalized.country || "";
  normalized.state = normalized.state || "";
  normalized.city = normalized.city || "";
  normalized.postalCode = normalized.postalCode || "";
  normalized.street = normalized.street || "";
  normalized.formattedAddress = fallbackFormattedAddress(normalized, fallbackAddress);
  return normalized;
}

async function migrateUsers() {
  const users = await User.find({ addressLocation: { $exists: true } });
  let modified = 0;

  for (const user of users) {
    if (!user.addressLocation) continue;
    const nextLocation = normalizeLocation(user.addressLocation, user.address);
    user.addressLocation = nextLocation;
    await user.save();
    modified += 1;
  }

  return modified;
}

async function migrateOrders() {
  const orders = await Order.find({ shippingAddress: { $exists: true } });
  let modified = 0;

  for (const order of orders) {
    if (!order.shippingAddress) continue;
    const shipping = order.shippingAddress;
    const normalized = normalizeLocation(shipping, shipping.street);
    shipping.provider = normalized.provider;
    shipping.accuracy = normalized.accuracy;
    shipping.timestamp = normalized.timestamp;
    shipping.country = normalized.country;
    shipping.state = normalized.state;
    shipping.formattedAddress = normalized.formattedAddress;
    shipping.deliveryInstructions = shipping.deliveryInstructions || "";
    await order.save();
    modified += 1;
  }

  return modified;
}

async function run() {
  const mongoURI =
    process.env.MONGO_URI ||
    "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";

  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    const userUpdates = await migrateUsers();
    const orderUpdates = await migrateOrders();

    console.log(`Users updated: ${userUpdates}`);
    console.log(`Orders updated: ${orderUpdates}`);
  } catch (error) {
    console.error("Location metadata migration failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();

