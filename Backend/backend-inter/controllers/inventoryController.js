import sellerOfferModel from "../models/sellerOffer.js";
import productModel from "../models/products.js";
import ProductVariant from "../models/productVariant.js";
import Order from "../models/order.js";
import Seller from "../models/seller.js";
import InventoryLog from "../models/inventoryLog.js";
import mongoose from "mongoose";

/**
 * ======================================================
 * INVENTORY MANAGEMENT CONTROLLER (ADMIN)
 * ======================================================
 * Full inventory management for admin panel:
 *
 * 1. Dashboard overview (stats + metrics)
 * 2. List all inventory items (with search, filter, sort, pagination)
 * 3. Get single inventory item details
 * 4. Update stock (restock / adjust)
 * 5. Bulk update stock
 * 6. Low stock alerts
 * 7. Inventory movement history (logs)
 * 8. Category-wise stock summary
 * 9. Seller-wise stock summary
 * 10. Export inventory data
 * ======================================================
 */

// ──────────────────────────────────────────────
// 1. INVENTORY DASHBOARD OVERVIEW
// GET /api/admin/inventory/dashboard
// ──────────────────────────────────────────────
export async function getInventoryDashboard(req, res) {
  try {
    // Total products in catalog
    const totalProducts = await productModel.countDocuments();

    // Total active seller offers (inventory items)
    const totalOffers = await sellerOfferModel.countDocuments();
    const activeOffers = await sellerOfferModel.countDocuments({ isActive: true });

    // Stock calculations
    const stockAgg = await sellerOfferModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stock" },
          avgStock: { $avg: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
        },
      },
    ]);

    const stockStats = stockAgg[0] || { totalStock: 0, avgStock: 0, totalValue: 0 };

    // Low stock count (threshold: 10 units)
    const lowStockCount = await sellerOfferModel.countDocuments({
      isActive: true,
      stock: { $gt: 0, $lte: 10 },
    });

    // Out of stock count
    const outOfStockCount = await sellerOfferModel.countDocuments({
      isActive: true,
      stock: 0,
    });

    // Total orders (all time)
    const totalOrders = await Order.countDocuments();

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Total units sold (from delivered orders)
    const unitsSoldAgg = await Order.aggregate([
      { $match: { status: { $in: ["delivered", "shipped", "confirmed"] } } },
      { $unwind: "$items" },
      { $group: { _id: null, totalUnitsSold: { $sum: "$items.quantity" } } },
    ]);
    const totalUnitsSold = unitsSoldAgg[0]?.totalUnitsSold || 0;

    // Total revenue
    const revenueAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // Category-wise stock distribution (top 6)
    const categoryStock = await sellerOfferModel.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          totalStock: { $sum: "$stock" },
          offerCount: { $sum: 1 },
        },
      },
      { $sort: { totalStock: -1 } },
      { $limit: 6 },
    ]);

    // Monthly stock movement (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyMovement = await InventoryLog.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          restocked: {
            $sum: {
              $cond: [{ $gt: ["$quantityChange", 0] }, "$quantityChange", 0],
            },
          },
          sold: {
            $sum: {
              $cond: [{ $lt: ["$quantityChange", 0] }, { $abs: "$quantityChange" }, 0],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const formattedMovement = monthlyMovement.map((m) => ({
      name: `${months[m._id.month - 1]} ${m._id.year}`,
      restocked: m.restocked,
      sold: m.sold,
    }));

    res.json({
      overview: {
        totalProducts,
        totalOffers,
        activeOffers,
        totalStock: stockStats.totalStock,
        avgStock: Math.round(stockStats.avgStock),
        totalInventoryValue: Math.round(stockStats.totalValue * 100) / 100,
        lowStockCount,
        outOfStockCount,
        totalOrders,
        totalUnitsSold,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      ordersByStatus: ordersByStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      categoryStock,
      monthlyMovement: formattedMovement,
    });
  } catch (error) {
    console.error("❌ Inventory dashboard error:", error);
    res.status(500).json({ message: "Failed to load inventory dashboard", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 2. LIST ALL INVENTORY ITEMS
// GET /api/admin/inventory
// ──────────────────────────────────────────────
export async function getAllInventory(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      category = "",
      stockStatus = "", // "low", "out", "healthy"
      sort = "latest",
      seller = "",
    } = req.query;

    const pipeline = [];

    // Join product info
    pipeline.push({
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    });
    pipeline.push({ $unwind: "$product" });

    // Join variant info
    pipeline.push({
      $lookup: {
        from: "productvariants",
        localField: "variantIds",
        foreignField: "_id",
        as: "variants",
      },
    });

    // Join seller info
    pipeline.push({
      $lookup: {
        from: "sellers",
        localField: "sellerId",
        foreignField: "_id",
        as: "sellerInfo",
      },
    });
    pipeline.push({
      $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true },
    });

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "product.productName": { $regex: search, $options: "i" } },
            { "product.brand": { $regex: search, $options: "i" } },
            { sellerName: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Category filter
    if (category && category !== "all") {
      pipeline.push({ $match: { "product.category": category } });
    }

    // Seller filter
    if (seller) {
      pipeline.push({
        $match: { sellerId: new mongoose.Types.ObjectId(seller) },
      });
    }

    // Stock status filter
    if (stockStatus === "out") {
      pipeline.push({ $match: { stock: 0 } });
    } else if (stockStatus === "low") {
      pipeline.push({ $match: { stock: { $gt: 0, $lte: 10 } } });
    } else if (stockStatus === "healthy") {
      pipeline.push({ $match: { stock: { $gt: 10 } } });
    }

    // Sorting
    const sortMap = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      stock_asc: { stock: 1 },
      stock_desc: { stock: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      name_asc: { "product.productName": 1 },
      name_desc: { "product.productName": -1 },
    };
    pipeline.push({ $sort: sortMap[sort] || { createdAt: -1 } });

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await sellerOfferModel.aggregate(countPipeline);
    const totalItems = countResult[0]?.total || 0;

    // Pagination
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    // Lookup orders to compute items sold and revenue per offer
    pipeline.push({
      $lookup: {
        from: "orders",
        let: { offerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$status", "cancelled"] },
                  { $in: ["$$offerId", "$items.sellerOfferId"] },
                ],
              },
            },
          },
          { $unwind: "$items" },
          { $match: { $expr: { $eq: ["$items.sellerOfferId", "$$offerId"] } } },
          {
            $group: {
              _id: null,
              itemsSold: { $sum: "$items.quantity" },
              revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
            },
          },
        ],
        as: "salesData",
      },
    });
    pipeline.push({
      $addFields: {
        itemsSold: { $ifNull: [{ $arrayElemAt: ["$salesData.itemsSold", 0] }, 0] },
        revenue: { $ifNull: [{ $arrayElemAt: ["$salesData.revenue", 0] }, 0] },
      },
    });

    // Shape response
    pipeline.push({
      $project: {
        _id: 1,
        productId: "$product._id",
        productName: "$product.productName",
        productImage: "$product.image",
        category: "$product.category",
        brand: "$product.brand",
        sellerId: 1,
        sellerName: 1,
        sellerShop: "$sellerInfo.shopName",
        variants: {
          $map: {
            input: "$variants",
            as: "v",
            in: {
              _id: "$$v._id",
              variantName: "$$v.variantName",
              color: "$$v.color",
              storage: "$$v.storage",
              size: "$$v.size",
            },
          },
        },
        price: 1,
        stock: 1,
        warranty: 1,
        isActive: 1,
        discountPercentage: 1,
        image: 1,
        createdAt: 1,
        updatedAt: 1,
        itemsSold: 1,
        revenue: 1,
      },
    });

    const items = await sellerOfferModel.aggregate(pipeline);

    res.json({
      items,
      totalItems,
      currentPage: Number(page),
      totalPages: Math.ceil(totalItems / Number(limit)),
    });
  } catch (error) {
    console.error("❌ Get all inventory error:", error);
    res.status(500).json({ message: "Failed to fetch inventory", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 3. GET SINGLE INVENTORY ITEM DETAILS
// GET /api/admin/inventory/:id
// ──────────────────────────────────────────────
export async function getInventoryItem(req, res) {
  try {
    const offer = await sellerOfferModel
      .findById(req.params.id)
      .populate("productId", "productName image category brand description specs")
      .populate("sellerId", "shopName rating address phone userId")
      .populate("variantIds", "variantName color storage size image");

    if (!offer) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    // Get recent stock movement logs
    const logs = await InventoryLog.find({ sellerOfferId: offer._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("performedBy", "email firstName lastName");

    // Get recent orders containing this offer
    const recentOrders = await Order.find({
      "items.sellerOfferId": offer._id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "email firstName lastName");

    res.json({ offer, logs, recentOrders });
  } catch (error) {
    console.error("❌ Get inventory item error:", error);
    res.status(500).json({ message: "Failed to fetch inventory item", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 4. UPDATE STOCK (ADMIN)
// PUT /api/admin/inventory/:id/stock
// ──────────────────────────────────────────────
export async function updateStock(req, res) {
  try {
    const { quantityChange, type, reason } = req.body;

    if (quantityChange === undefined || !type) {
      return res.status(400).json({ message: "quantityChange and type are required" });
    }

    const validTypes = ["restock", "adjustment", "return", "damaged"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    }

    const offer = await sellerOfferModel.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const previousStock = offer.stock;
    const newStock = previousStock + Number(quantityChange);

    if (newStock < 0) {
      return res.status(400).json({
        message: `Cannot reduce stock below 0. Current: ${previousStock}, Change: ${quantityChange}`,
      });
    }

    offer.stock = newStock;
    await offer.save();

    // Log the change
    await InventoryLog.create({
      sellerOfferId: offer._id,
      productId: offer.productId,
      sellerId: offer.sellerId,
      type,
      quantityChange: Number(quantityChange),
      previousStock,
      newStock,
      reason: reason || "",
      performedBy: req.user.id,
    });

    res.json({
      message: "Stock updated successfully",
      previousStock,
      newStock,
      quantityChange: Number(quantityChange),
    });
  } catch (error) {
    console.error("❌ Update stock error:", error);
    res.status(500).json({ message: "Failed to update stock", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 5. BULK UPDATE STOCK
// PUT /api/admin/inventory/bulk-update
// ──────────────────────────────────────────────
export async function bulkUpdateStock(req, res) {
  try {
    const { updates } = req.body;
    // updates = [{ offerId, quantityChange, type, reason }]

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "updates array is required" });
    }

    if (updates.length > 100) {
      return res.status(400).json({ message: "Maximum 100 items per bulk update" });
    }

    const results = [];
    const errors = [];

    for (const item of updates) {
      try {
        const offer = await sellerOfferModel.findById(item.offerId);
        if (!offer) {
          errors.push({ offerId: item.offerId, error: "Not found" });
          continue;
        }

        const previousStock = offer.stock;
        const newStock = previousStock + Number(item.quantityChange);

        if (newStock < 0) {
          errors.push({
            offerId: item.offerId,
            error: `Stock would go below 0 (current: ${previousStock})`,
          });
          continue;
        }

        offer.stock = newStock;
        await offer.save();

        await InventoryLog.create({
          sellerOfferId: offer._id,
          productId: offer.productId,
          sellerId: offer.sellerId,
          type: item.type || "adjustment",
          quantityChange: Number(item.quantityChange),
          previousStock,
          newStock,
          reason: item.reason || "Bulk update",
          performedBy: req.user.id,
        });

        results.push({
          offerId: item.offerId,
          previousStock,
          newStock,
        });
      } catch (err) {
        errors.push({ offerId: item.offerId, error: err.message });
      }
    }

    res.json({
      message: `Bulk update complete. ${results.length} succeeded, ${errors.length} failed.`,
      results,
      errors,
    });
  } catch (error) {
    console.error("❌ Bulk update error:", error);
    res.status(500).json({ message: "Failed to perform bulk update", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 6. LOW STOCK ALERTS
// GET /api/admin/inventory/alerts
// ──────────────────────────────────────────────
export async function getLowStockAlerts(req, res) {
  try {
    const { threshold = 10, page = 1, limit = 20 } = req.query;

    const pipeline = [
      { $match: { isActive: true, stock: { $lte: Number(threshold) } } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "sellers",
          localField: "sellerId",
          foreignField: "_id",
          as: "sellerInfo",
        },
      },
      { $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true } },
      { $sort: { stock: 1 } },
    ];

    const countResult = await sellerOfferModel.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const totalItems = countResult[0]?.total || 0;

    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 1,
          productName: "$product.productName",
          productImage: "$product.image",
          category: "$product.category",
          brand: "$product.brand",
          sellerName: 1,
          sellerShop: "$sellerInfo.shopName",
          price: 1,
          stock: 1,
          isActive: 1,
          urgency: {
            $cond: [{ $eq: ["$stock", 0] }, "critical", { $cond: [{ $lte: ["$stock", 5] }, "high", "medium"] }],
          },
        },
      }
    );

    const alerts = await sellerOfferModel.aggregate(pipeline);

    res.json({
      alerts,
      totalItems,
      currentPage: Number(page),
      totalPages: Math.ceil(totalItems / Number(limit)),
      threshold: Number(threshold),
    });
  } catch (error) {
    console.error("❌ Low stock alerts error:", error);
    res.status(500).json({ message: "Failed to fetch stock alerts", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 7. INVENTORY MOVEMENT HISTORY
// GET /api/admin/inventory/history
// ──────────────────────────────────────────────
export async function getInventoryHistory(req, res) {
  try {
    const {
      page = 1,
      limit = 30,
      type = "",
      offerId = "",
      productId = "",
      sellerId = "",
    } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (offerId) filter.sellerOfferId = offerId;
    if (productId) filter.productId = productId;
    if (sellerId) filter.sellerId = sellerId;

    const totalItems = await InventoryLog.countDocuments(filter);

    const logs = await InventoryLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate("performedBy", "email firstName lastName")
      .populate("productId", "productName image")
      .populate("sellerId", "shopName")
      .populate("sellerOfferId", "price sellerName");

    res.json({
      logs,
      totalItems,
      currentPage: Number(page),
      totalPages: Math.ceil(totalItems / Number(limit)),
    });
  } catch (error) {
    console.error("❌ Inventory history error:", error);
    res.status(500).json({ message: "Failed to fetch inventory history", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 8. CATEGORY-WISE STOCK SUMMARY
// GET /api/admin/inventory/categories
// ──────────────────────────────────────────────
export async function getCategoryStockSummary(req, res) {
  try {
    const summary = await sellerOfferModel.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
          offerCount: { $sum: 1 },
          avgPrice: { $avg: "$price" },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ["$stock", 10] }, 1, 0] },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] },
          },
        },
      },
      { $sort: { totalStock: -1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error("❌ Category stock summary error:", error);
    res.status(500).json({ message: "Failed to fetch category summary", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 9. SELLER-WISE STOCK SUMMARY (with full details)
// GET /api/admin/inventory/sellers
// ──────────────────────────────────────────────
export async function getSellerStockSummary(req, res) {
  try {
    const { search = "", status = "" } = req.query;

    // Get all sellers (not just those with active offers)
    const sellerMatch = {};
    if (status === "active") sellerMatch.isActive = true;
    else if (status === "inactive") sellerMatch.isActive = false;
    if (status === "pending") { sellerMatch.verificationStatus = "pending"; delete sellerMatch.isActive; }
    if (status === "approved") { sellerMatch.verificationStatus = "approved"; delete sellerMatch.isActive; }
    if (status === "rejected") { sellerMatch.verificationStatus = "rejected"; delete sellerMatch.isActive; }
    if (search) sellerMatch.shopName = { $regex: search, $options: "i" };

    const sellers = await Seller.find(sellerMatch)
      .populate("userId", "email firstName lastName phone")
      .sort({ createdAt: -1 });

    const sellerIds = sellers.map(s => s._id);

    // Inventory stats per seller (all offers, not just active)
    const inventoryStats = await sellerOfferModel.aggregate([
      { $match: { sellerId: { $in: sellerIds } } },
      {
        $group: {
          _id: "$sellerId",
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
          offerCount: { $sum: 1 },
          activeOffers: { $sum: { $cond: ["$isActive", 1, 0] } },
          lowStockCount: { $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] }, 1, 0] } },
          outOfStockCount: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
        },
      },
    ]);

    // Revenue per seller (from non-cancelled orders)
    const revenueStats = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" }, sellerId: { $in: sellerIds } } },
      {
        $group: {
          _id: "$sellerId",
          totalRevenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
          itemsSold: { $sum: { $sum: "$items.quantity" } },
        },
      },
    ]);

    const invMap = Object.fromEntries(inventoryStats.map(s => [s._id.toString(), s]));
    const revMap = Object.fromEntries(revenueStats.map(s => [s._id.toString(), s]));

    const result = sellers.map(s => {
      const inv = invMap[s._id.toString()] || {};
      const rev = revMap[s._id.toString()] || {};
      return {
        _id: s._id,
        shopName: s.shopName,
        description: s.description,
        rating: s.rating,
        totalReviews: s.totalReviews,
        verificationStatus: s.verificationStatus,
        address: s.address,
        phone: s.phone,
        isActive: s.isActive,
        createdAt: s.createdAt,
        email: s.userId?.email,
        ownerName: s.userId ? `${s.userId.firstName || ""} ${s.userId.lastName || ""}`.trim() : "",
        userPhone: s.userId?.phone,
        // Inventory
        offerCount: inv.offerCount || 0,
        activeOffers: inv.activeOffers || 0,
        totalStock: inv.totalStock || 0,
        totalValue: inv.totalValue || 0,
        lowStockCount: inv.lowStockCount || 0,
        outOfStockCount: inv.outOfStockCount || 0,
        // Sales
        totalRevenue: rev.totalRevenue || 0,
        totalOrders: rev.totalOrders || 0,
        itemsSold: rev.itemsSold || 0,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Seller stock summary error:", error);
    res.status(500).json({ message: "Failed to fetch seller summary", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 9b. TOGGLE SELLER ACTIVE STATUS (ENABLE / DISABLE)
// PUT /api/admin/inventory/sellers/:id/toggle
// ──────────────────────────────────────────────
export async function toggleSellerStatus(req, res) {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.isActive = !seller.isActive;
    await seller.save();

    res.json({
      message: `Seller ${seller.isActive ? "enabled" : "disabled"} successfully`,
      isActive: seller.isActive,
    });
  } catch (error) {
    console.error("❌ Toggle seller status error:", error);
    res.status(500).json({ message: "Failed to toggle seller status", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 9c. UPDATE SELLER VERIFICATION STATUS
// PUT /api/admin/inventory/sellers/:id/verify
// ──────────────────────────────────────────────
export async function updateSellerVerification(req, res) {
  try {
    const { verificationStatus } = req.body;
    if (!["pending", "approved", "rejected"].includes(verificationStatus)) {
      return res.status(400).json({ message: "Invalid verificationStatus" });
    }
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { verificationStatus },
      { new: true }
    );
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    res.json({ message: `Seller verification set to ${verificationStatus}`, seller });
  } catch (error) {
    console.error("❌ Update seller verification error:", error);
    res.status(500).json({ message: "Failed to update verification", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 10. TOGGLE OFFER STATUS (ACTIVATE / DEACTIVATE)
// PUT /api/admin/inventory/:id/toggle
// ──────────────────────────────────────────────
export async function toggleOfferStatus(req, res) {
  try {
    const offer = await sellerOfferModel.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    res.json({
      message: `Offer ${offer.isActive ? "activated" : "deactivated"} successfully`,
      isActive: offer.isActive,
    });
  } catch (error) {
    console.error("❌ Toggle offer status error:", error);
    res.status(500).json({ message: "Failed to toggle offer status", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 11. GET ALL CATEGORIES (for filters)
// GET /api/admin/inventory/filter-options
// ──────────────────────────────────────────────
export async function getFilterOptions(req, res) {
  try {
    const categories = await productModel.distinct("category");
    const sellers = await Seller.find({ isActive: true })
      .select("_id shopName")
      .sort({ shopName: 1 });

    res.json({ categories, sellers });
  } catch (error) {
    console.error("❌ Filter options error:", error);
    res.status(500).json({ message: "Failed to fetch filter options", error: error.message });
  }
}

// ──────────────────────────────────────────────
// 12. EXPORT INVENTORY DATA (JSON)
// GET /api/admin/inventory/export
// ──────────────────────────────────────────────
export async function exportInventory(req, res) {
  try {
    const items = await sellerOfferModel.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "sellers",
          localField: "sellerId",
          foreignField: "_id",
          as: "sellerInfo",
        },
      },
      { $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productName: "$product.productName",
          category: "$product.category",
          brand: "$product.brand",
          sellerShop: "$sellerInfo.shopName",
          sellerName: 1,
          price: 1,
          stock: 1,
          warranty: 1,
          isActive: 1,
          discountPercentage: 1,
          createdAt: 1,
        },
      },
      { $sort: { "product.productName": 1 } },
    ]);

    res.setHeader("Content-Disposition", "attachment; filename=inventory-export.json");
    res.setHeader("Content-Type", "application/json");
    res.json({ exportDate: new Date().toISOString(), totalItems: items.length, items });
  } catch (error) {
    console.error("❌ Export inventory error:", error);
    res.status(500).json({ message: "Failed to export inventory", error: error.message });
  }
}
