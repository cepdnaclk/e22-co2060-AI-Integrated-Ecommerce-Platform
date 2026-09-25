/**
 * ======================================================
 * PAYOUT ROUTER
 * ======================================================
 * All routes require admin or CEO authentication.
 * authMiddleware verifies the JWT Bearer token.
 * authorizeRoles restricts access to admin and ceo roles only.
 * ======================================================
 */

import express from "express";
import authMiddleware, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getPayouts,
  getEligiblePayouts,
  getPayoutById,
  runPayouts,
  retryPayout
} from "../controllers/payoutController.js";

const router = express.Router();

// All payout routes require admin or CEO authentication
router.use(authMiddleware, authorizeRoles("admin", "ceo"));

// GET  /api/accounting/payouts           → list all payout records
router.get("/", getPayouts);

// GET  /api/accounting/payouts/eligible  → live-computed eligible orders
router.get("/eligible", getEligiblePayouts);

// GET  /api/accounting/payouts/:id       → single payout by payoutId
router.get("/:id", getPayoutById);

// POST /api/accounting/payouts/run       → batch + process all eligible payouts
router.post("/run", runPayouts);

// POST /api/accounting/payouts/:id/retry → retry FAILED/RETRY_PENDING payout
router.post("/:id/retry", retryPayout);

export default router;
