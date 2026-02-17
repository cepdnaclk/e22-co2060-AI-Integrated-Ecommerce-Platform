import express from "express";
import {
  registerSeller,
  getMySellerProfile,
  updateSellerProfile,
  getSellerById
} from "../controllers/sellerController.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ======================================================
 * SELLER REGISTRATION
 * POST /api/sellers/register
 * ======================================================
 * - User must be logged in
 * - User role must be "seller"
 * - Creates seller business profile
 */
router.post(
  "/register",
  verifyToken,
  authorizeRoles("seller"),
  registerSeller
);

/**
 * ======================================================
 * GET LOGGED-IN SELLER PROFILE
 * GET /api/sellers/me
 * ======================================================
 */
router.get(
  "/me",
  verifyToken,
  authorizeRoles("seller"),
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
  verifyToken,
  authorizeRoles("seller"),
  updateSellerProfile
);

/**
 * ======================================================
 * GET PUBLIC SELLER PROFILE (BUYER SIDE)
 * GET /api/sellers/:id
 * ======================================================
 * - Public endpoint
 * - Used for seller profile pages
 */
router.get("/:id", getSellerById);

export default router;
