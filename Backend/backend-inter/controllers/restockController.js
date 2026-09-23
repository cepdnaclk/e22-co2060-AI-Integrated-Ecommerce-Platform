import sellerOfferModel from "../models/sellerOffer.js";
import productModel from "../models/products.js";
import ProductVariant from "../models/productVariant.js";
import Order from "../models/order.js";
import InventoryLog from "../models/inventoryLog.js";
import mongoose from "mongoose";
import {
  scoreSingleSKU,
  scoreBatchSKUs,
  getCriticalSKUs,
  getCurrentWeights,
  recalculateWeights,
  explainSKU,
  submitFeedback,
  checkHealth,
} from "../services/restockMLService.js";

/**
 * ======================================================
 * RESTOCK PRIORITY CONTROLLER (ADMIN)
 * ======================================================
 * Manages restock priority scoring via the ML microservice.
 * Bridges inventory data from MongoDB to the ML scoring API.
 *
 * 1. Score single product for restock priority
 * 2. Score all products in batch
 * 3. Get critical restock items
 * 4. Get/recalculate weights
 * 5. Get SHAP explanation for a product
 * 6. Submit restock feedback
 * 7. ML service health check
 * ======================================================
 */

// ─── Helper: Build SKU features from DB data ───

async function buildSKUFeatures(offerId) {
  const offer = await sellerOfferModel
    .findById(offerId)
    .populate({
      path: "productVariant",
      populate: { path: "product" },
    })
    .lean();

  if (!offer) throw new Error("Seller offer not found");

  const productId = offer.productVariant?.product?._id;
  const variantId = offer.productVariant?._id;

  // Sales data from orders (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const salesAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: ninetyDaysAgo }, orderStatus: { $ne: "cancelled" } } },
    { $unwind: "$orderItems" },
    { $match: { "orderItems.sellerOffer": new mongoose.Types.ObjectId(offerId) } },
    {
      $group: {
        _id: null,
        totalUnitsSold: { $sum: "$orderItems.quantity" },
        totalRevenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const sales = salesAgg[0] || { totalUnitsSold: 0, totalRevenue: 0, orderCount: 0 };

  // Inventory logs for history
  const logs = await InventoryLog.find({
    sellerOffer: offerId,
    createdAt: { $gte: ninetyDaysAgo },
  })
    .sort({ createdAt: 1 })
    .lean();

  // Compute basic features
  const days = 90;
  const demandRate = sales.totalUnitsSold / Math.max(days, 1);
  const stock = offer.stock || 0;
  const daysOfSupply = demandRate > 0 ? stock / demandRate : 180;
  const sellingPrice = offer.price || 0;
  const costPrice = offer.costPrice || sellingPrice * 0.6;
  const profitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 30;

  // Lead time from restock logs
  const restockLogs = logs.filter((l) => l.type === "restock");
  const leadTimes = [];
  for (let i = 1; i < restockLogs.length; i++) {
    const diff = (new Date(restockLogs[i].createdAt) - new Date(restockLogs[i - 1].createdAt)) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff < 120) leadTimes.push(diff);
  }
  const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 14;

  // Stockout cost estimate
  const lostSalesPerDay = demandRate;
  const stockoutCost = (sellingPrice - costPrice) * lostSalesPerDay * 7;

  // Holding cost
  const holdingCost = stock * costPrice * 0.25 / 365 * days;

  // Supplier reliability (from restock log patterns)
  const totalRestocks = restockLogs.length || 1;
  const supplierReliabilityFailure = Math.min(0.3, 1 - (totalRestocks > 3 ? 0.85 : 0.7));

  // Seasonality (simple: current month demand vs average)
  const seasonalityIndex = 1.0;

  // Default external factors (can be overridden by admin)
  const defaultExternalFactors = {
    MV: 0.3, CCR: 0.15, DFE: 0.2,
    WU: 0.6, CFP: 0.3, ITR: 4.0,
    SCDI: 0.25, IDR: 0.3, GRI: 0.2,
    CPP: 0.25, PED: 0.4, IBG: 0.15,
    MCI: 0.5, CSC: 0.6, BLI: 0.5,
    IR: 0.3, SCI: 0.5, PPR: 0.1,
    SCR: 0.4, GSCV: 0.25, SFH: 0.7,
    SDCV: 0.3, ISI: 0.25, CEI: 0.15,
  };

  return {
    sku_id: offerId.toString(),
    features: {
      D: demandRate,
      S: daysOfSupply,
      L: avgLeadTime,
      P: profitMargin,
      SC: stockoutCost,
      HC: holdingCost,
      SR: supplierReliabilityFailure,
      SE: seasonalityIndex,
    },
    external_factors: defaultExternalFactors,
    metadata: {
      product_name: offer.productVariant?.product?.productName || "Unknown",
      variant: offer.productVariant?.searchText || "",
      seller: offer.seller?.toString() || "",
      current_stock: stock,
      price: sellingPrice,
    },
  };
}

// ─── 1. Score Single Product ───

export async function scoreProduct(req, res) {
  try {
    const { id } = req.params;
    const skuData = await buildSKUFeatures(id);
    const result = await scoreSingleSKU(skuData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ scoreProduct error:", error.message);
    if (error.response?.status) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data?.detail || error.message,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. Score All Products (Batch) ───

export async function scoreAllProducts(req, res) {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Get active seller offers with stock info
    const offers = await sellerOfferModel
      .find({ isActive: true })
      .select("_id stock price costPrice productVariant seller")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const skuList = [];
    for (const offer of offers) {
      try {
        const features = await buildSKUFeatures(offer._id);
        skuList.push(features);
      } catch (e) {
        console.warn(`⚠️ Skipping offer ${offer._id}: ${e.message}`);
      }
    }

    if (skuList.length === 0) {
      return res.json({ success: true, data: [], message: "No products to score" });
    }

    const result = await scoreBatchSKUs(skuList);
    res.json({ success: true, data: result, count: skuList.length });
  } catch (error) {
    console.error("❌ scoreAllProducts error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. Get Critical Restock Items ───

export async function getCriticalRestockItems(req, res) {
  try {
    const { threshold = 0.75 } = req.query;
    const result = await getCriticalSKUs(parseFloat(threshold));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ getCriticalRestockItems error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. Get Current Weights ───

export async function getRestockWeights(req, res) {
  try {
    const result = await getCurrentWeights();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ getRestockWeights error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 5. Recalculate Weights ───

export async function recalcRestockWeights(req, res) {
  try {
    const externalFactors = req.body;
    const result = await recalculateWeights(externalFactors);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ recalcRestockWeights error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 6. Get SHAP Explanation ───

export async function getRestockExplanation(req, res) {
  try {
    const { skuId } = req.params;
    const result = await explainSKU(skuId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ getRestockExplanation error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 7. Submit Feedback ───

export async function submitRestockFeedback(req, res) {
  try {
    const { skuId } = req.params;
    const feedbackData = req.body;
    const result = await submitFeedback(skuId, feedbackData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ submitRestockFeedback error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 8. ML Service Health Check ───

export async function restockMLHealth(req, res) {
  try {
    const result = await checkHealth();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(503).json({ success: false, data: { status: "unavailable" } });
  }
}
