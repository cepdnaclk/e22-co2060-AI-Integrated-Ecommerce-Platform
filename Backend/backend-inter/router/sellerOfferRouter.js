import express from "express";
import { addSellerOffer } from "../controllers/sellerOfferController.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  verifyToken,
  authorizeRoles("seller"),
  addSellerOffer
);

export default router;
