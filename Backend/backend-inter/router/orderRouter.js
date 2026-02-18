import express from "express";
import {
  createOrder,
  getMyOrders,
  getSellerOrders
} from "../controllers/orderController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

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
 * 🏪 GET SELLER'S ORDERS
 * GET /api/orders/seller/:sellerId
 */
router.get(
  "/seller/:sellerId",
  authMiddleware,
  getSellerOrders
);

export default router;
