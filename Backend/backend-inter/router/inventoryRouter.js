import { Router } from "express";
import verifyToken, { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getInventoryDashboard,
  getAllInventory,
  getInventoryItem,
  updateStock,
  bulkUpdateStock,
  getLowStockAlerts,
  getInventoryHistory,
  getCategoryStockSummary,
  getSellerStockSummary,
  toggleSellerStatus,
  updateSellerVerification,
  toggleOfferStatus,
  getFilterOptions,
  exportInventory,
} from "../controllers/inventoryController.js";

const router = Router();

// All routes require admin authentication
router.use(verifyToken, authorizeRoles("admin", "ceo"));

// Dashboard overview
router.get("/dashboard", getInventoryDashboard);

// Filter options (categories + sellers list)
router.get("/filter-options", getFilterOptions);

// Low stock alerts
router.get("/alerts", getLowStockAlerts);

// Inventory movement history
router.get("/history", getInventoryHistory);

// Category-wise summary
router.get("/categories", getCategoryStockSummary);

// Seller management
router.get("/sellers", getSellerStockSummary);
router.put("/sellers/:id/toggle", toggleSellerStatus);
router.put("/sellers/:id/verify", updateSellerVerification);

// Export inventory data
router.get("/export", exportInventory);

// Bulk stock update
router.put("/bulk-update", bulkUpdateStock);

// List all inventory (must come before /:id to avoid conflicts)
router.get("/", getAllInventory);

// Single item operations
router.get("/:id", getInventoryItem);
router.put("/:id/stock", updateStock);
router.put("/:id/toggle", toggleOfferStatus);

export default router;
