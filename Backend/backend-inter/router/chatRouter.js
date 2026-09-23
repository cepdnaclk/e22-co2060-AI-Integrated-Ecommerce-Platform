import express from "express";
import { handleChatMessage } from "../controllers/chatController.js";

const router = express.Router();

/**
 * ======================================================
 * AI CUSTOMER SUPPORT CHATBOT
 * POST /api/chat
 * ======================================================
 */
router.post("/", handleChatMessage);

export default router;
