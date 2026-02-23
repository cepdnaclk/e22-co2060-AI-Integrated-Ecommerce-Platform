import express from "express";
import {
  createVariant,
  getVariantsByProduct
} from "../controllers/productVariantController.js";

const router = express.Router();

router.post("/create", createVariant);
router.get("/product/:productId", getVariantsByProduct);

export default router;