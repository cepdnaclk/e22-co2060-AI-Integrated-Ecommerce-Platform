import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
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
} from "../controllers/adminAuthController.js";

const router = Router();

/**
 * ======================================================
 * ADMIN AUTHENTICATION ROUTES
 * Separate authentication system for admin users
 * Face recognition endpoints are modular — they work
 * only when FACE_RECOGNITION_ENABLED=true in .env
 * ======================================================
 */

// ── Public routes (no auth — uses pendingToken internally) ──
router.post("/login", adminLogin);
router.post("/verify-face", adminVerifyFace);
router.post("/enroll-face", adminEnrollFace);

// ── Protected routes (admin only) ──
router.get("/verify", verifyToken, authorizeRoles("admin"), verifyAdminToken);
router.post("/logout", verifyToken, authorizeRoles("admin"), adminLogout);
router.post("/create", verifyToken, authorizeRoles("admin"), createAdmin);

// ── Face management (admin only) ──
router.post("/register-face", verifyToken, authorizeRoles("admin"), registerAdminFace);
router.delete("/remove-face", verifyToken, authorizeRoles("admin"), removeAdminFace);
router.get("/face-status", verifyToken, authorizeRoles("admin"), getFaceStatus);

// ── Admin team management (admin only) ──
router.get("/admins", verifyToken, authorizeRoles("admin"), listAdmins);
router.post("/register-face/:adminId", verifyToken, authorizeRoles("admin"), registerAdminFaceById);
router.delete("/remove-face/:adminId", verifyToken, authorizeRoles("admin"), removeAdminFaceById);

// ── Audit logs (admin only) ──
router.get("/login-logs", verifyToken, authorizeRoles("admin"), getLoginLogs);

export default router;
