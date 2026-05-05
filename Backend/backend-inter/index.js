import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// ================== ROUTERS ==================
import authRouter from "./router/authRouter.js";
import adminAuthRouter from "./router/adminAuthRouter.js"; // ✅ Admin Auth
import aiRouter from "./router/aiRouter.js";
import productRouter from "./router/productRouter.js";
import sellerOfferRouter from "./router/sellerOfferRouter.js";
import cartRouter from "./router/cartRouter.js";      // ✅ Cart
import orderRouter from "./router/orderRouter.js";
import exportRouter from "./router/exportRouter.js";   // ✅ Order
import sellerRouter from "./router/sellerRouter.js"; //seller router
import userRouter from "./router/userRouter.js"; // ✅ Users
import chatRouter from "./router/chatRouter.js"; // ✅ AI Chatbot
import searchRouter from "./router/searchRouter.js"; // ✅ Smart Search
import inventoryRouter from "./router/inventoryRouter.js"; // ✅ Inventory Management
import adminProductRouter from "./router/adminProductRouter.js"; // ✅ Admin Product Management
import adminOrderRouter from "./router/adminOrderRouter.js"; // ✅ Admin Order Management
import restockRouter from "./router/restockRouter.js"; // 🤖 Restock Priority ML
import recommendationRouter from "./router/recommendationRouter.js"; // 🧭 Dijkstra Recommendations
import dmsRouter from "./dms/routes/dmsRouter.js"; // 🚚 Enterprise Delivery Management System
import trendingRouter from "./router/trendingRouter.js"; // 📈 YouTube Trending


// ================== CRON JOBS ==================
import "./cron/dailySendToAI.js";
import "./cron/graphRebuildJob.js";

// ================== CONFIG ==================
dotenv.config();

const PORT = process.env.PORT || 3000;

const mongoURI =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

// ================== APP ==================
const app = express();

// ================== MIDDLEWARE ==================

// Parse JSON request bodies
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://localhost:5173",
  "http://localhost:3000"
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.includes(origin) || 
                       origin.endsWith(".up.railway.app") || 
                       /^https?:\/\/localhost:\d+$/.test(origin);
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// ================== TOKEN DEBUG (OPTIONAL) ==================
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    console.log("🔐 Authorization Header:", authHeader);
  }
  next();
});

// ================== ROUTES ==================
app.use("/api/chat", chatRouter);

// Auth (login, register)
app.use("/api/auth", authRouter);

// 🔐 Admin Authentication (separate login for admins)
app.use("/api/admin/auth", adminAuthRouter);

// AI features
app.use("/api/ai", aiRouter);

// Trending Products
app.use("/api/trending", trendingRouter);


// Product catalog (browse products)
app.use("/api/products", productRouter);

//seller profile
app.use("/api/sellers", sellerRouter);

// Seller offers (price, stock per seller)
app.use("/api/seller-offers", sellerOfferRouter);

// 🔍 Smart Search (Products + Variants + Offers)
app.use("/api/search", searchRouter);

// 👤 Users
app.use("/api/users", userRouter);

// 🛒 Cart (buyer side)
app.use("/api/cart", cartRouter);

// 📦 Orders (checkout & order history)
app.use("/api/orders", orderRouter);


app.use("/api/export", exportRouter);

// 📦 Admin Inventory Management
app.use("/api/admin/inventory", inventoryRouter);

// 📦 Admin Product Management (CRUD with auth)
app.use("/api/admin/products", adminProductRouter);

// 📋 Admin Order Management (view & track)
app.use("/api/admin/orders", adminOrderRouter);

// 🤖 Admin Restock Priority ML Scoring
app.use("/api/admin/restock", restockRouter);

// 🧭 Product Recommendations (Dijkstra)
app.use("/api/recommendations", recommendationRouter);
// 🚚 Delivery Management System
app.use("/api/dms", dmsRouter);
if ((process.env.ENABLE_FACEBOOK_MODULE || "false").toLowerCase() === "true") {
  const { default: facebookRouter } = await import("./router/facebookRouter.js");
  app.use("/api/facebook", facebookRouter);
}

// ================== TEST ROUTES ==================

// Protected test route
app.get("/api/protected", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  res.json({
    message: "Token received successfully ✅",
    token
  });
});

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ================== GLOBAL ERROR HANDLER ==================
// Must be defined AFTER all routes and with 4 arguments so Express treats it as error middleware.
// This ensures any unhandled async/sync error returns JSON instead of Express's default HTML page.
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled Express error:", err.message, err.stack);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ================== DATABASE ==================

// Obfuscate URI for logging
const loggableUri = mongoURI.replace(/\/\/.*@/, "//****:****@").split("?")[0];
console.log(`🔌 Attempting to connect to MongoDB: ${loggableUri}`);

if (mongoURI.includes("${{")) {
  console.error("⚠️ CRITICAL: MONGO_URI appears to contain an unresolved Railway variable: " + mongoURI);
  console.error("Please ensure your MONGO_URI environment variable is set to a real connection string.");
}

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    // In production, we might want to exit, but for debugging 502s, 
    // let's keep the process alive so Nginx can at least reach it.
  });

// ================== SERVER ==================

function startServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log("🚀 Server started successfully");
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📡 Port: ${PORT}`);
    console.log("=================================");
  });
}

// Start server immediately so Nginx doesn't 502 while waiting for DB
startServer();
