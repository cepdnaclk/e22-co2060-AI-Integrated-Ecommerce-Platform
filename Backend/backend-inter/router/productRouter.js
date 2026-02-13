import express from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getTopThreeProducts,
} from "../controllers/productController.js";

const router = express.Router();

/**
 * CREATE PRODUCT
 */
router.post("/create", createProduct);

/**
 * UPDATE PRODUCT
 * PUT /api/products/:id
 */
router.put("/:id", updateProduct);

/**
 * DELETE PRODUCT
 * DELETE /api/products/:id
 */
router.delete("/:id", deleteProduct);

/**
 * GET TOP 3 PRODUCTS
 */
router.get("/top-three", getTopThreeProducts);

export default router;
