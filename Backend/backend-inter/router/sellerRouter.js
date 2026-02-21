import express from "express";
import {
  registerSeller,
  verifySellerEmail,
  getMySellerProfile,
  updateSellerProfile,
  getSellerById,
} from "../controllers/sellerController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ======================================================
 * EMAIL VERIFICATION — public, no auth needed
 * GET /api/sellers/verify-email?token=xxx
 * ======================================================
 */
router.get("/verify-email", verifySellerEmail);

/**
 * ======================================================
 * SELLER REGISTRATION
 * POST /api/sellers/register
 * ======================================================
 */
router.post("/register", authMiddleware, registerSeller);

/**
 * ======================================================
 * GET LOGGED-IN SELLER PROFILE
 * GET /api/sellers/me
 * ======================================================
 */
router.get("/me", authMiddleware, getMySellerProfile);

/**
 * ======================================================
 * UPDATE LOGGED-IN SELLER PROFILE
 * PUT /api/sellers/me
 * ======================================================
 */
router.put("/me", authMiddleware, updateSellerProfile);

/**
 * ======================================================
 * GET PUBLIC SELLER PROFILE
 * GET /api/sellers/:id
 * ======================================================
 */
router.get("/:id", getSellerById);

export default router;