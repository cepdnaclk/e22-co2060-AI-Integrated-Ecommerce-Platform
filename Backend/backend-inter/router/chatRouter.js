import express from "express";
import { handleChatMessage } from "../controllers/chatController.js";
import { handleMongoDbRagChat } from "../controllers/mongoDbRagController.js";

const router = express.Router();

/**
 * ======================================================
 * AI CUSTOMER SUPPORT CHATBOT
 * POST /api/chat (Existing primary chatbot route)
 * ======================================================
 */
router.post("/", handleChatMessage);

/**
 * ======================================================
 * MONGODB ATLAS VECTOR SEARCH RAG ENDPOINT
 * POST /api/chat/mongodb-rag (New parallel Atlas RAG route)
 * ======================================================
 */
router.post("/mongodb-rag", handleMongoDbRagChat);

export default router;
