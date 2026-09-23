import express from "express";
import {
  createPayment,
  notifyPayment,
  getPaymentStatus
} from "../controllers/paymentController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ======================================================
 * PAYHERE PAYMENT ROUTES
 * ======================================================
 */

/**
 * 💳 CREATE PAYHERE CHECKOUT (Protected)
 * POST /api/payment/create
 */
router.post("/create", authMiddleware, createPayment);

/**
 * 🔔 PAYHERE NOTIFY CALLBACK (Public Form-Urlencoded Webhook)
 * POST /api/payment/notify
 */
router.post("/notify", notifyPayment);

/**
 * 🔍 GET PAYMENT STATUS FROM DATABASE (Public/Protected Status Check)
 * GET /api/payment/status/:orderId
 */
router.get("/status/:orderId", getPaymentStatus);

export default router;
