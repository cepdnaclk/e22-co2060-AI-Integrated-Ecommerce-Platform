import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRouter from "./router/authRouter.js";
import "./cron/dailySendToAI.js";
import aiRouter from "./router/aiRouter.js";
import productRouter from "./router/productRouter.js";


// ================== CONFIG ==================
const PORT = 3000;

const mongoURI =
  "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";

// ================== APP ==================
const app = express();

// ================== MIDDLEWARE ==================

// Parse JSON bodies
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://192.168.248.238:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ================== TOKEN DEBUG MIDDLEWARE ==================
// This logs token if frontend sends it

app.use((req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    console.log("🔐 Authorization Header:", authHeader);
  } else {
    console.log("⚠️ No Authorization header found");
  }

  next();
});

// ================== ROUTES ==================

// Auth routes
app.use("/api/auth", authRouter);

// AI result routes
app.use("/api/ai", aiRouter);

// Product routes
app.use("/api/products", productRouter);

// Test protected route
app.get("/api/protected", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  res.json({
    message: "Token received successfully ✅",
    token: token,
  });
});

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ================== DATABASE ==================

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    startServer();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// ================== SERVER ==================

function startServer() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log("🚀 Server started successfully");
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log("=================================");
  });
}
