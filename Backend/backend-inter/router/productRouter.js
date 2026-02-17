import express from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getTopThreeProducts,
  getAllProducts,
  getProductById
} from "../controllers/productController.js";

const router = express.Router();

/**
 * ✅ CREATE PRODUCT (ADMIN)
 * Product = global catalog item (no price, no seller)
 * POST /api/products
 */
router.post("/", createProduct);

/**
 * ✅ GET TOP 3 PRODUCTS (AI)
 * GET /api/products/top-three
 */
router.get("/top-three", getTopThreeProducts);

/**
 * ✅ BROWSE + SEARCH PRODUCTS
 * GET /api/products
 * ?search=
 * ?category=
 * ?sort=price_asc | price_desc | latest
 * ?page=
 * ?limit=
 */
router.get("/", getAllProducts);

/**
 * ✅ UPDATE PRODUCT (ADMIN)
 * PUT /api/products/:id
 */
router.put("/:id", updateProduct);

/**
 * ✅ DELETE PRODUCT (ADMIN)
 * DELETE /api/products/:id
 */
router.delete("/:id", deleteProduct);

/**
 * ✅ PRODUCT DETAILS + SELLER OFFERS
 * GET /api/products/:id
 * ⚠️ MUST BE LAST
 */
router.get("/:id", getProductById);

export default router;
