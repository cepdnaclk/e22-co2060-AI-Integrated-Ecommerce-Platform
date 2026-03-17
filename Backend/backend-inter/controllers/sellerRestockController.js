import sellerOfferModel from "../models/sellerOffer.js";
import Order from "../models/order.js";
import InventoryLog from "../models/inventoryLog.js";
import Seller from "../models/seller.js";
import mongoose from "mongoose";

/**
 * ======================================================
 * SELLER RESTOCK CONTROLLER
 * ======================================================
 * Provides restock priority scoring for sellers to see
 * which of THEIR products need restocking most urgently.
 *
 * Uses the deterministic priority formula directly so
 * sellers can get results even when the ML service is down.
 * ======================================================
 */

// ─── Priority Score Formula ───
// PS = w1·D + w2·(1−S) + w3·L + w4·P + w5·SC + w6·(1−HC) + w7·SR + w8·SE

const FALLBACK_WEIGHTS = {
  w1: 0.25, w2: 0.20, w3: 0.15, w4: 0.10,
  w5: 0.10, w6: 0.08, w7: 0.07, w8: 0.05,
};

const TIERS = [
  { name: "CRITICAL", min: 0.75, max: 1.00, action: "Restock immediately", response: "24 hours" },
  { name: "HIGH",     min: 0.50, max: 0.74, action: "Place priority order", response: "3 days" },
  { name: "MEDIUM",   min: 0.25, max: 0.49, action: "Schedule restock", response: "1 week" },
  { name: "LOW",      min: 0.00, max: 0.24, action: "Monitor only", response: "Monthly" },
];

function getTier(score) {
  for (const t of TIERS) {
    if (score >= t.min && score <= t.max) return t;
  }
  return TIERS[3];
}

function minmax(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function computePriorityScore(features, weights = FALLBACK_WEIGHTS) {
  const { D, S, L, P, SC, HC, SR, SE } = features;
  const score =
    weights.w1 * D +
    weights.w2 * (1 - S) +
    weights.w3 * L +
    weights.w4 * P +
    weights.w5 * SC +
    weights.w6 * (1 - HC) +
    weights.w7 * SR +
    weights.w8 * SE;
  return Math.max(0, Math.min(1, score));
}

// ─── Build features for a single offer ───

async function buildOfferFeatures(offer, sellerId) {
  const offerId = offer._id;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Sales in last 90 days
  const salesAgg = await Order.aggregate([
    { $match: { sellerId, createdAt: { $gte: ninetyDaysAgo }, status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $match: { "items.sellerOfferId": offerId } },
    {
      $group: {
        _id: null,
        totalUnitsSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const sales = salesAgg[0] || { totalUnitsSold: 0, totalRevenue: 0, orderCount: 0 };

  const days = 90;
  const demandRate = sales.totalUnitsSold / Math.max(days, 1);
  const stock = offer.stock || 0;
  const daysOfSupply = demandRate > 0 ? stock / demandRate : 180;
  const sellingPrice = offer.price || 0;
  const costPrice = offer.costPrice || sellingPrice * 0.6;
  const profitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 30;

  // Lead time from restock logs
  const restockLogs = await InventoryLog.find({
    sellerOfferId: offerId,
    type: "restock",
    createdAt: { $gte: ninetyDaysAgo },
  }).sort({ createdAt: 1 }).lean();

  const leadTimes = [];
  for (let i = 1; i < restockLogs.length; i++) {
    const diff = (new Date(restockLogs[i].createdAt) - new Date(restockLogs[i - 1].createdAt)) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff < 120) leadTimes.push(diff);
  }
  const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 14;

  const stockoutCost = (sellingPrice - costPrice) * demandRate * 7;
  const holdingCost = stock * costPrice * 0.25 / 365 * days;
  const supplierReliability = Math.min(0.3, 1 - (restockLogs.length > 3 ? 0.85 : 0.7));

  return {
    raw: { demandRate, stock, daysOfSupply, avgLeadTime, profitMargin, stockoutCost, holdingCost, supplierReliability, sellingPrice, costPrice, unitsSold: sales.totalUnitsSold, orderCount: sales.orderCount, revenue: sales.totalRevenue },
    D: demandRate,
    S: daysOfSupply,
    L: avgLeadTime,
    P: profitMargin,
    SC: stockoutCost,
    HC: holdingCost,
    SR: supplierReliability,
    SE: 1.0,
  };
}

/**
 * GET /api/sellers/restock/priorities
 * Returns all seller's offers scored and ranked by restock priority.
 */
export async function getSellerRestockPriorities(req, res) {
  try {
    const sellerId = req.sellerId;

    const offers = await sellerOfferModel
      .find({ sellerId, isActive: true })
      .populate({ path: "productId", select: "productName image category" })
      .lean();

    if (offers.length === 0) {
      return res.json({ success: true, data: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } });
    }

    // Build features for all offers
    const results = [];
    const allFeatures = [];

    for (const offer of offers) {
      try {
        const features = await buildOfferFeatures(offer, sellerId);
        allFeatures.push({ offer, features });
      } catch (e) {
        console.warn(`⚠️ Skipping offer ${offer._id}: ${e.message}`);
      }
    }

    if (allFeatures.length === 0) {
      return res.json({ success: true, data: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 } });
    }

    // Compute min/max for normalization across this seller's products
    const keys = ["D", "S", "L", "P", "SC", "HC", "SR", "SE"];
    const mins = {}, maxs = {};
    for (const k of keys) {
      const values = allFeatures.map(f => f.features[k]);
      mins[k] = Math.min(...values);
      maxs[k] = Math.max(...values);
    }

    // Normalize and score
    for (const { offer, features } of allFeatures) {
      const normalized = {};
      for (const k of keys) {
        normalized[k] = minmax(features[k], mins[k], maxs[k]);
      }

      const score = computePriorityScore(normalized);
      const tier = getTier(score);

      results.push({
        offerId: offer._id,
        productName: offer.productId?.productName || "Unknown",
        productImage: offer.productId?.image || "",
        category: offer.productId?.category || "",
        price: offer.price,
        currentStock: offer.stock,
        score: Math.round(score * 10000) / 10000,
        tier: tier.name,
        action: tier.action,
        responseTime: tier.response,
        metrics: {
          demandRate: Math.round(features.raw.demandRate * 100) / 100,
          daysOfSupply: Math.round(features.raw.daysOfSupply),
          avgLeadTime: Math.round(features.raw.avgLeadTime),
          profitMargin: Math.round(features.raw.profitMargin * 10) / 10,
          unitsSold90d: features.raw.unitsSold,
          orderCount90d: features.raw.orderCount,
          revenue90d: Math.round(features.raw.revenue * 100) / 100,
        },
      });
    }

    // Sort by score descending (highest priority first)
    results.sort((a, b) => b.score - a.score);

    // Add rank
    results.forEach((r, i) => { r.rank = i + 1; });

    // Summary
    const summary = {
      total: results.length,
      critical: results.filter(r => r.tier === "CRITICAL").length,
      high: results.filter(r => r.tier === "HIGH").length,
      medium: results.filter(r => r.tier === "MEDIUM").length,
      low: results.filter(r => r.tier === "LOW").length,
    };

    res.json({ success: true, data: results, summary });
  } catch (error) {
    console.error("❌ getSellerRestockPriorities error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}
