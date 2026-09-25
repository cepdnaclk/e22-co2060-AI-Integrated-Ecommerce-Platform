import express from "express";
import {
  createPaymentSession,
  handlePaymentsLkWebhook,
  getPaymentStatus
} from "../controllers/paymentsLkController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ======================================================
 * PAYMENTS.LK PAYMENT ROUTES
 * ======================================================
 */

/**
 * 💳 CREATE PAYMENTS.LK CHECKOUT SESSION (Protected)
 * POST /api/payments/create
 */
router.post("/create", authMiddleware, createPaymentSession);

/**
 * 🔔 PAYMENTS.LK WEBHOOK ENDPOINT (Public Signed Webhook)
 * POST /api/payments/webhook
 */
router.post("/webhook", handlePaymentsLkWebhook);

/**
 * 🔍 GET PAYMENT STATUS FROM DATABASE (Protected)
 * GET /api/payments/status/:orderId
 */
router.get("/status/:orderId", authMiddleware, getPaymentStatus);

export default router;
