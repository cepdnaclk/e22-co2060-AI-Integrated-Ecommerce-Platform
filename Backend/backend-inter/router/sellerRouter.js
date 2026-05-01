import express from "express";
import multer from "multer";
import {
  registerSeller,
  verifySellerEmail,
  getMySellerProfile,
  updateSellerProfile,
  getSellerById,
} from "../controllers/sellerController.js";
import { getSellerDashboardStats } from "../controllers/sellerDashboardController.js";
import { getSellerRestockPriorities } from "../controllers/sellerRestockController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import Seller from "../models/seller.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});
let facebookControllerPromise = null;

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
 * SELLER RESTOCK PRIORITIES
 * GET /api/sellers/restock/priorities
 * Returns all seller offers ranked by restock urgency.
 * ======================================================
 */
router.get("/restock/priorities", authMiddleware, requireSeller, getSellerRestockPriorities);

/**
 * ======================================================
 * SELLER MARKETING SCHEDULER (FACEBOOK)
 * Base: /api/sellers/marketing/facebook
 * ======================================================
 */
const requireFacebookModule = (req, res, next) => {
  const enabled = (process.env.ENABLE_FACEBOOK_MODULE || "false").toLowerCase() === "true";
  if (!enabled) {
    res.status(503).json({ message: "Facebook scheduler is disabled. Set ENABLE_FACEBOOK_MODULE=true." });
    return;
  }
  next();
};

const withFacebookController = (handlerName) => async (req, res, next) => {
  try {
    if (!facebookControllerPromise) {
      facebookControllerPromise = import("../controllers/facebookController.js");
    }
    const controller = await facebookControllerPromise;
    return controller[handlerName](req, res, next);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load Facebook scheduler module", error: error.message });
  }
};

router.get(
  "/marketing/facebook/connect",
  authMiddleware,
  requireSeller,
  requireFacebookModule,
  withFacebookController("getFacebookConnectUrl")
);
router.get(
  "/marketing/facebook/pages",
  authMiddleware,
  requireSeller,
  requireFacebookModule,
  withFacebookController("listFacebookPages")
);
router.get(
  "/marketing/facebook/pages/selected",
  authMiddleware,
  requireSeller,
  requireFacebookModule,
  withFacebookController("listSelectedPages")
);
router.post(
  "/marketing/facebook/pages/select",
  authMiddleware,
  requireSeller,
  requireFacebookModule,
  withFacebookController("saveSelectedPages")
);
router.post(
  "/marketing/facebook/posts",
  authMiddleware,
  requireSeller,
  upload.single("image"),
  requireFacebookModule,
  withFacebookController("createScheduledPost")
);
router.get(
  "/marketing/facebook/posts",
  authMiddleware,
  requireSeller,
  requireFacebookModule,
  withFacebookController("listScheduledPosts")
);
router.delete(
  "/marketing/facebook/posts/:id",
  authMiddleware,
  requireSeller,
  requireFacebookModule,
  withFacebookController("deleteScheduledPost")
);

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
