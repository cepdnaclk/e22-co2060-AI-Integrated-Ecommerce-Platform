import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getCommissionPolicy,
  setCommissionPolicy,
  listJournals,
  getOrderJournals,
  settleOrder,
  getAccountingSummary
} from "../controllers/accountingController.js";

const router = express.Router();

/**
 * ======================================================
 * ACCOUNTING ROUTES — Marketplace Bookkeeping
 * ======================================================
 */

// ─── Commission Policy ───────────────────────────────
router.get("/commission", authMiddleware, getCommissionPolicy);
router.post("/commission", authMiddleware, setCommissionPolicy);

// ─── Journal Queries ──────────────────────────────────
router.get("/journal", authMiddleware, listJournals);
router.get("/journal/:orderId", authMiddleware, getOrderJournals);

// ─── Settlement ───────────────────────────────────────
router.post("/settle/:orderId", authMiddleware, settleOrder);

// ─── Dashboard Summary ────────────────────────────────
router.get("/summary", authMiddleware, getAccountingSummary);

export default router;
