import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getAllOrders,
  getOrderStats,
  getOrderById,
  updateOrderStatus,
  verifySellerQr,
} from "../controllers/adminOrderController.js";

const router = Router();

// All routes require admin authentication
router.use(verifyToken, authorizeRoles("admin", "ceo"));

// GET  /api/admin/orders/stats     → order statistics
router.get("/stats", getOrderStats);

// GET  /api/admin/orders           → list all orders (with filters)
router.get("/", getAllOrders);

// GET  /api/admin/orders/:id       → single order details
router.get("/:id", getOrderById);

// PUT  /api/admin/orders/:id/status → update order status
router.put("/:id/status", updateOrderStatus);

// PUT  /api/admin/orders/:id/seller-qr/verify → approve/reject seller proof
router.put("/:id/seller-qr/verify", verifySellerQr);

export default router;
