import express from "express";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getTopThreeProducts,
  getAllProducts,
  getProductById,
  searchProductsPost
} from "../controllers/productController.js";

const router = express.Router();

/**
 * CREATE PRODUCT
 * POST /api/products/create
 */
router.post("/create", createProduct);

/**
 * 🔍 POST SEARCH (MUST BE BEFORE :id)
 * POST /api/products/search
 */
router.post("/search", searchProductsPost);

/**
 * GET TOP 3 PRODUCTS (AI)
 * GET /api/products/top-three
 */
router.get("/top-three", getTopThreeProducts);

/**
 * BROWSE + SEARCH PRODUCTS (GET)
 * GET /api/products?search=hp gaming laptop
 */
router.get("/", getAllProducts);

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
 * PRODUCT DETAILS
 * GET /api/products/:id
 * ⚠️ MUST BE LAST
 */
router.get("/:id", getProductById);

export default router;
