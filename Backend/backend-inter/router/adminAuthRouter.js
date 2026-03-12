import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  adminLogin,
  createAdmin,
  verifyAdminToken,
  adminLogout
} from "../controllers/adminAuthController.js";

const router = Router();

/**
 * ======================================================
 * ADMIN AUTHENTICATION ROUTES
 * Separate authentication system for admin users
 * ======================================================
 */

// Public route - Admin login (no auth required)
router.post("/login", adminLogin);

// Protected routes - Require admin authentication
router.get("/verify", verifyToken, authorizeRoles("admin"), verifyAdminToken);
router.post("/logout", verifyToken, authorizeRoles("admin"), adminLogout);

// Super admin only - Create new admin accounts
router.post("/create", verifyToken, authorizeRoles("admin"), createAdmin);

export default router;
