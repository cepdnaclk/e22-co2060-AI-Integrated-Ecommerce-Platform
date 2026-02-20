import express from "express";
import {
  registerSeller,
  getMySellerProfile,
  updateSellerProfile,
  getSellerById
} from "../controllers/sellerController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ======================================================
 * SELLER REGISTRATION
 * POST /api/sellers/register
 * ======================================================
 * - Any authenticated user can register as seller
 */
router.post(
  "/register",
  authMiddleware,
  registerSeller
);

/**
 * ======================================================
 * GET LOGGED-IN SELLER PROFILE
 * GET /api/sellers/me
 * ======================================================
 * - Only works if user has seller profile
 */
router.get(
  "/me",
  authMiddleware,
  getMySellerProfile
);

/**
 * ======================================================
 * UPDATE LOGGED-IN SELLER PROFILE
 * PUT /api/sellers/me
 * ======================================================
 */
router.put(
  "/me",
  authMiddleware,
  updateSellerProfile
);

/**
 * ======================================================
 * GET PUBLIC SELLER PROFILE
 * GET /api/sellers/:id
 * ======================================================
 */
router.get("/:id", getSellerById);

export default router;