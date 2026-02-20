import express from "express";

import authMiddleware, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  addSellerOffer,
  searchSellerOffers
} from "../controllers/sellerOfferController.js";

const router = express.Router();

/**
 * ======================================================
 * SELLER OFFER ROUTES
 * ======================================================
 * Only authenticated SELLERS can create offers
 * ======================================================
 */
router.post(
  "/",
  authMiddleware,          // ✅ default export (verifyToken)
  authorizeRoles("seller"),// ✅ named export
  addSellerOffer
);

// 🔍 BUYER SEARCH
router.get("/search", searchSellerOffers);

export default router;
