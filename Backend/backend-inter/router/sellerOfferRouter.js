import express from "express";

import authMiddleware, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  addSellerOffer,
  getMySellerOffers,
  updateSellerOffer,
  disableSellerOffer,
  searchSellerOffers
} from "../controllers/sellerOfferController.js";

const router = express.Router();

/**
 * ======================================================
 * SELLER OFFER ROUTES
 * ======================================================
 */

// 🔍 BUYER SEARCH (public)
router.get("/search", searchSellerOffers);

// 🧑‍💼 GET MY OFFERS (seller only)
router.get(
  "/my",
  authMiddleware,
  authorizeRoles("seller"),
  getMySellerOffers
);

// ➕ CREATE OFFER (seller only)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("seller"),
  addSellerOffer
);

// ✏️ UPDATE OFFER (seller only)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("seller"),
  updateSellerOffer
);

// ⏸️ DISABLE OFFER (seller only)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("seller"),
  disableSellerOffer
);

export default router;
