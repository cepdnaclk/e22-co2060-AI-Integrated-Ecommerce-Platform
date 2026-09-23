import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getRecommendations,
  getPath,
  rebuildGraph,
  stats,
} from "../controllers/recommendationController.js";

const router = Router();

router.get("/graph/stats", stats);
router.post("/rebuild", verifyToken, authorizeRoles("admin", "ceo"), rebuildGraph);
router.get("/:productId/path/:targetId", getPath);
router.get("/:productId", getRecommendations);

export default router;

