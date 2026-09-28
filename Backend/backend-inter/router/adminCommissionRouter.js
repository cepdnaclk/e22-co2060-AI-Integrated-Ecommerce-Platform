import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getCommissionPolicy,
  updateCommissionPolicy
} from "../controllers/commissionController.js";

const router = Router();

// Commission management requires admin or CEO authentication
router.use(verifyToken, authorizeRoles("admin", "ceo"));

// GET current active commission policy
router.get("/", getCommissionPolicy);

// PUT update commission policy
router.put("/", updateCommissionPolicy);

export default router;
