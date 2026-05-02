import express from "express";
import {
  addToCart,
  updateCartItem,
  removeCartItem,
  getCart
} from "../controllers/cartController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ======================================================
 * CART ROUTES
 * ======================================================
 * All cart routes are PROTECTED
 * Buyer must be authenticated
 * ======================================================
 */

/**
 * 🛒 Get current user's cart
 * GET /api/cart
 */
router.get(
  "/",
  authMiddleware,
  getCart
);

/**
 * ➕ Add item to cart
 * POST /api/cart/add
 * Body: { sellerOfferId, quantity }
 */
router.post(
  "/add",
  authMiddleware,
  addToCart
);

/**
 * 🔄 Update cart item quantity
 * PUT /api/cart/update
 * Body: { sellerOfferId, quantity }
 */
router.put(
  "/update",
  authMiddleware,
  updateCartItem
);

/**
 * ❌ Remove item from cart
 * DELETE /api/cart/remove
 * Body: { sellerOfferId }
 */
router.delete(
  "/remove",
  authMiddleware,
  removeCartItem
);

export default router;
