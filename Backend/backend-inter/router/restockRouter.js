import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  scoreProduct,
  scoreAllProducts,
  getCriticalRestockItems,
  getRestockWeights,
  recalcRestockWeights,
  getRestockExplanation,
  submitRestockFeedback,
  restockMLHealth,
} from "../controllers/restockController.js";

const router = Router();

// All restock routes require admin/ceo authentication
router.use(verifyToken, authorizeRoles("admin", "ceo"));

// ─── Health Check ───
router.get("/health", restockMLHealth);

// ─── Scoring ───
router.post("/score/batch", scoreAllProducts);
router.get("/score/critical", getCriticalRestockItems);
router.post("/score/:id", scoreProduct);

// ─── Weights ───
router.get("/weights", getRestockWeights);
router.post("/weights/recalculate", recalcRestockWeights);

// ─── Explainability ───
router.get("/explain/:skuId", getRestockExplanation);

// ─── Feedback ───
router.post("/feedback/:skuId", submitRestockFeedback);

export default router;
