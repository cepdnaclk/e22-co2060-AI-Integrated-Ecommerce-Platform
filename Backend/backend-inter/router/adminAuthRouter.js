import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import { requireCEO } from "../middleware/requireCEO.js";
import {
  adminLogin,
  adminVerifyFace,
  adminEnrollFace,
  registerAdminFace,
  removeAdminFace,
  getFaceStatus,
  getLoginLogs,
  createAdmin,
  verifyAdminToken,
  adminLogout,
  listAdmins,
  registerAdminFaceById,
  removeAdminFaceById,
  removeAdmin,
} from "../controllers/adminAuthController.js";

const router = Router();

/**
 * ======================================================
 * ADMIN AUTHENTICATION ROUTES
 * Separate authentication system for admin users
 * Face recognition endpoints are modular — they work
 * only when FACE_RECOGNITION_ENABLED=true in .env
 *
 * CEO-only routes: create admin, register/remove face,
 * remove admin account.
 * ======================================================
 */

// ── Public routes (no auth — uses pendingToken internally) ──
router.post("/login", adminLogin);
router.post("/verify-face", adminVerifyFace);
router.post("/enroll-face", adminEnrollFace);

// ── Protected routes (admin or CEO) ──
router.get("/verify", verifyToken, authorizeRoles("admin", "ceo"), verifyAdminToken);
router.post("/logout", verifyToken, authorizeRoles("admin", "ceo"), adminLogout);

// ── CEO-only: Admin management ──
router.post("/create", verifyToken, requireCEO, createAdmin);
router.delete("/remove-admin/:adminId", verifyToken, requireCEO, removeAdmin);

// ── Face management (own face — CEO only; admins can only check status) ──
router.post("/register-face", verifyToken, requireCEO, registerAdminFace);
router.delete("/remove-face", verifyToken, requireCEO, removeAdminFace);
router.get("/face-status", verifyToken, authorizeRoles("admin", "ceo"), getFaceStatus);

// ── Admin team listing (admin or CEO can view) ──
router.get("/admins", verifyToken, authorizeRoles("admin", "ceo"), listAdmins);

// ── CEO-only: Manage other admins' faces ──
router.post("/register-face/:adminId", verifyToken, requireCEO, registerAdminFaceById);
router.delete("/remove-face/:adminId", verifyToken, requireCEO, removeAdminFaceById);

// ── Audit logs (CEO only) ──
router.get("/login-logs", verifyToken, requireCEO, getLoginLogs);

export default router;
