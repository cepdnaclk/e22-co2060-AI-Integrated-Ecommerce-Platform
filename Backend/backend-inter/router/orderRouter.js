import express from "express";
import multer from "multer";
import {
  createOrder,
  getMyOrders,
  getMySellerOrders,
  getSellerOrderQr,
  submitSellerPackingProof,
  getSellerOrders
} from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }
});

/**
 * ======================================================
 * ORDER ROUTES
 * ======================================================
 * All order routes are PROTECTED
 * User must be authenticated
 * ======================================================
 */

/**
 * 🛒 CHECKOUT
 * Create orders from cart (split by seller)
 * POST /api/orders
 */
router.post(
  "/",
  authMiddleware,
  createOrder
);

/**
 * 📦 GET BUYER'S ORDERS
 * GET /api/orders/my
 */
router.get(
  "/my",
  authMiddleware,
  getMyOrders
);

/**
 * 🧾 GET AUTH SELLER ORDERS
 * GET /api/orders/seller/me
 */
router.get(
  "/seller/me",
  authMiddleware,
  getMySellerOrders
);

/**
 * 🖼️ SELLER SUBMITS PACKING PROOF
 * POST /api/orders/seller/me/:orderId/packing-proof
 */
router.post(
  "/seller/me/:orderId/packing-proof",
  authMiddleware,
  upload.single("proofImage"),
  submitSellerPackingProof
);

/**
 * 🔳 GET SELLER QR (APPROVED ONLY)
 * GET /api/orders/seller/me/:orderId/seller-qr
 */
router.get(
  "/seller/me/:orderId/seller-qr",
  authMiddleware,
  getSellerOrderQr
);

/**
 * 🏪 GET SELLER'S ORDERS
 * GET /api/orders/seller/:sellerId
 */
router.get(
  "/seller/:sellerId",
  authMiddleware,
  getSellerOrders
);

export default router;
