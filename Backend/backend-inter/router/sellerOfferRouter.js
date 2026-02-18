import express from "express";
import { addSellerOffer } from "../controllers/sellerOfferController.js";
import authMiddleware, { authorizeRoles } from "../middleware/authMiddleware.js";

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

export default router;
