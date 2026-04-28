import Order from "../models/order.js";
import { buildSellerQrPayload } from "../services/sellerQrPayloadService.js";

/**
 * ======================================================
 * ADMIN ORDER CONTROLLER
 * ======================================================
 * Responsibilities:
 * - View all orders (with filters & pagination)
 * - View single order details
 * - Update order status (tracking)
 * - Verify seller packing proof and approve seller QR
 * ======================================================
 */

/**
 * GET /api/admin/orders
 * Query: ?status=pending&page=1&limit=20&search=email
 */
export async function getAllOrders(req, res) {
  try {
    const {
      status,
      sellerQrStatus,
      page = 1,
      limit = 20,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (sellerQrStatus && sellerQrStatus !== "all") {
      filter["sellerQr.verificationStatus"] = sellerQrStatus;
    }

    // Build query
    const query = Order.find(filter)
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName image")
      .populate("sellerQr.proofSubmittedBy", "email firstName lastName")
      .populate("sellerQr.verifiedBy", "email firstName lastName")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const [orders, totalCount] = await Promise.all([
      query,
      Order.countDocuments(filter),
    ]);

    // Optional: client-side search filter on email
    let filtered = orders;
    if (search) {
      const s = search.toLowerCase();
      filtered = orders.filter(
        (o) =>
          (o.userId?.email && o.userId.email.toLowerCase().includes(s)) ||
          (o.sellerId?.shopName &&
            o.sellerId.shopName.toLowerCase().includes(s)) ||
          o._id.toString().includes(s)
      );
    }

    res.json({
      orders: filtered,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
    });
  } catch (error) {
    console.error("❌ Admin getAllOrders error:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
}

/**
 * GET /api/admin/orders/stats
 * Returns order statistics
 */
export async function getOrderStats(req, res) {
  try {
    const [total, pending, confirmed, shipped, delivered, cancelled] =
      await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ status: "pending" }),
        Order.countDocuments({ status: "confirmed" }),
        Order.countDocuments({ status: "shipped" }),
        Order.countDocuments({ status: "delivered" }),
        Order.countDocuments({ status: "cancelled" }),
      ]);

    const revenueResult = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    res.json({
      total,
      pending,
      confirmed,
      shipped,
      delivered,
      cancelled,
      revenue: revenueResult[0]?.total || 0,
    });
  } catch (error) {
    console.error("❌ Admin getOrderStats error:", error);
    res.status(500).json({
      message: "Failed to fetch order stats",
      error: error.message,
    });
  }
}

/**
 * GET /api/admin/orders/:id
 */
export async function getOrderById(req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName image")
      .populate("sellerQr.proofSubmittedBy", "email firstName lastName")
      .populate("sellerQr.verifiedBy", "email firstName lastName");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("❌ Admin getOrderById error:", error);
    res.status(500).json({
      message: "Failed to fetch order",
      error: error.message,
    });
  }
}

/**
 * PUT /api/admin/orders/:id/status
 * Body: { status: "confirmed" | "shipped" | "delivered" | "cancelled" }
 */
export async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName image")
      .populate("sellerQr.proofSubmittedBy", "email firstName lastName")
      .populate("sellerQr.verifiedBy", "email firstName lastName");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: `Order status updated to "${status}"`,
      order,
    });
  } catch (error) {
    console.error("❌ Admin updateOrderStatus error:", error);
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  }
}

/**
 * PUT /api/admin/orders/:id/seller-qr/verify
 * Body: { action: "approve" | "reject", notes?: string }
 */
export async function verifySellerQr(req, res) {
  try {
    const { action, notes = "" } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: 'Invalid action. Must be "approve" or "reject".'
      });
    }

    const order = await Order.findById(req.params.id)
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName image")
      .populate("sellerQr.proofSubmittedBy", "email firstName lastName")
      .populate("sellerQr.verifiedBy", "email firstName lastName");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.sellerQr?.proofImageUrl) {
      return res.status(400).json({
        message: "Seller has not submitted packing proof for this order yet."
      });
    }

    if (action === "approve") {
      const qrPayload = buildSellerQrPayload(order);
      order.sellerQr = {
        ...order.sellerQr,
        verificationStatus: "approved",
        verificationNote: notes.trim(),
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        qrPayload,
        qrGeneratedAt: new Date()
      };
    } else {
      order.sellerQr = {
        ...order.sellerQr,
        verificationStatus: "rejected",
        verificationNote: notes.trim() || "Rejected by admin.",
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        qrPayload: null,
        qrGeneratedAt: null
      };
    }

    await order.save();

    const updated = await Order.findById(order._id)
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName image")
      .populate("sellerQr.proofSubmittedBy", "email firstName lastName")
      .populate("sellerQr.verifiedBy", "email firstName lastName");

    res.json({
      message:
        action === "approve"
          ? "Seller proof approved and seller QR is ready."
          : "Seller proof rejected.",
      order: updated
    });
  } catch (error) {
    console.error("❌ Admin verifySellerQr error:", error);
    res.status(500).json({
      message: "Failed to verify seller packing proof",
      error: error.message
    });
  }
}
