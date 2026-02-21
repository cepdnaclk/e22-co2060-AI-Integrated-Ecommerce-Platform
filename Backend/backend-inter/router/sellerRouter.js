import express from "express";
import {
  registerSeller,
  verifySellerEmail,
  getMySellerProfile,
  updateSellerProfile,
  getSellerById,
} from "../controllers/sellerController.js";
import { getSellerDashboardStats } from "../controllers/sellerDashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Seller from "../models/seller.js";

const router = express.Router();

/**
 * Middleware to ensure the user is an approved seller and attach req.sellerId
 */
const requireSeller = async (req, res, next) => {
  try {
    if (req.user.role !== "seller") {
      return res.status(403).json({ message: "Access denied. Not a seller." });
    }
    const seller = await Seller.findOne({ userId: req.user.id });
    if (!seller) {
      return res.status(404).json({ message: "Seller profile not found." });
    }
    req.sellerId = seller._id;
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error checking seller status" });
  }
};

/**
 * ======================================================
 * SELLER DASHBOARD STATS
 * GET /api/sellers/dashboard/stats
 * ======================================================
 */
router.get("/dashboard/stats", authMiddleware, requireSeller, getSellerDashboardStats);

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