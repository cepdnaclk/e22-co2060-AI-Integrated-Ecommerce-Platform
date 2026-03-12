import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminAllProducts,
  getVariantsByProduct,
  createVariant,
  updateVariant,
  deleteVariant,
} from "../controllers/productController.js";

const router = Router();

// All routes require admin authentication
router.use(verifyToken, authorizeRoles("admin"));

// ── Product CRUD ──────────────────────────────────────
// GET  /api/admin/products          → list all products (admin view)
router.get("/", getAdminAllProducts);

// POST /api/admin/products          → create product
router.post("/", createProduct);

// PUT  /api/admin/products/:id      → update product
router.put("/:id", updateProduct);

// DELETE /api/admin/products/:id    → delete product + related offers
router.delete("/:id", deleteProduct);

// ── Variant CRUD ──────────────────────────────────────
// GET  /api/admin/products/:id/variants           → list variants
router.get("/:id/variants", getVariantsByProduct);

// POST /api/admin/products/:id/variants           → create variant
router.post("/:id/variants", createVariant);

// PUT  /api/admin/products/:id/variants/:variantId → update variant
router.put("/:id/variants/:variantId", updateVariant);

// DELETE /api/admin/products/:id/variants/:variantId → delete variant
router.delete("/:id/variants/:variantId", deleteVariant);

export default router;
