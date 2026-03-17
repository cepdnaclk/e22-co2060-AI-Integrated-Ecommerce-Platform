import axios from "axios";
import sellerOfferModel from "../models/sellerOffer.js";
import Order from "../models/order.js";
import InventoryLog from "../models/inventoryLog.js";

/**
 * ======================================================
 * SELLER RESTOCK CONTROLLER
 * ======================================================
 * Scores seller products via the ML FastAPI service (port 8001).
 * Falls back to the deterministic formula if the ML service is down.
 * ======================================================
 */

const ML_API = process.env.RESTOCK_ML_API || "http://localhost:8001";

// ─── Fallback deterministic scoring (used when ML API is unreachable) ───

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

function computeFallbackScore(features) {
  const w = FALLBACK_WEIGHTS;
  const { D, S, L, P, SC, HC, SR, SE } = features;
  return Math.max(0, Math.min(1,
    w.w1 * D + w.w2 * (1 - S) + w.w3 * L + w.w4 * P +
    w.w5 * SC + w.w6 * (1 - HC) + w.w7 * SR + w.w8 * SE
  ));
}

// ─── Build 8 features for a single offer from MongoDB ───

async function buildOfferFeatures(offer, sellerId) {
  const offerId = offer._id;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

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

  const restockLogs = await InventoryLog.find({
    sellerOfferId: offerId, type: "restock", createdAt: { $gte: ninetyDaysAgo },
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

// ─── Call ML API for batch scoring ───

async function scoreViaMLAPI(skuPayloads) {
  const response = await axios.post(`${ML_API}/score/batch`, skuPayloads, { timeout: 30000 });
  return response.data; // { results: [...], total, timestamp }
}

// ─── Fallback: score locally using deterministic formula ───

function scoreLocalFallback(allFeatures) {
  const keys = ["D", "S", "L", "P", "SC", "HC", "SR", "SE"];
  const mins = {}, maxs = {};
  for (const k of keys) {
    const values = allFeatures.map(f => f.features[k]);
    mins[k] = Math.min(...values);
    maxs[k] = Math.max(...values);
  }

  return allFeatures.map(({ features }) => {
    const normalized = {};
    for (const k of keys) normalized[k] = minmax(features[k], mins[k], maxs[k]);
    const score = computeFallbackScore(normalized);
    const tier = getTier(score);
    return { priority_score: score, tier: tier.name, action: tier.action, response_time: tier.response };
  });
}

/**
 * GET /api/sellers/restock/priorities
 * Returns all seller's offers scored and ranked by restock priority.
 * Tries ML API first → falls back to deterministic formula.
 */
export async function getSellerRestockPriorities(req, res) {
  try {
    const sellerId = req.sellerId;

    const offers = await sellerOfferModel
      .find({ sellerId, isActive: true })
      .populate({ path: "productId", select: "productName image category" })
      .lean();

    if (offers.length === 0) {
      return res.json({ success: true, data: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }, scoringMode: "none" });
    }

    // Build features for all offers from real MongoDB data
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
      return res.json({ success: true, data: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 }, scoringMode: "none" });
    }

    // Prepare payload for ML API
    const skuPayloads = allFeatures.map(({ offer, features }) => ({
      SKU_ID: offer._id.toString(),
      D: features.D,
      S: features.S,
      L: features.L,
      P: features.P,
      SC: features.SC,
      HC: features.HC,
      SR: features.SR,
      SE: features.SE,
    }));

    // Try ML API first, fall back to deterministic
    let mlResults = null;
    let scoringMode = "ml_ensemble";

    try {
      const mlResponse = await scoreViaMLAPI(skuPayloads);
      mlResults = mlResponse.results;
      console.log(`✅ ML API scored ${mlResults.length} SKUs via ensemble model`);
    } catch (mlError) {
      console.warn(`⚠️ ML API unavailable (${mlError.message}), using deterministic fallback`);
      scoringMode = "deterministic_fallback";
    }

    // Build results
    const results = [];

    for (let i = 0; i < allFeatures.length; i++) {
      const { offer, features } = allFeatures[i];

      let score, tierName, action, responseTime, weightsUsed;

      if (mlResults) {
        // Match ML result by SKU_ID
        const mlResult = mlResults.find(r => r.sku_id === offer._id.toString());
        if (mlResult) {
          score = mlResult.priority_score;
          tierName = mlResult.tier;
          action = mlResult.action;
          responseTime = mlResult.response_time;
          weightsUsed = mlResult.weights_used || null;
        } else {
          // ML didn't return this SKU — use fallback for this one
          const fallback = scoreLocalFallback([{ features }]);
          score = fallback[0].priority_score;
          tierName = fallback[0].tier;
          action = fallback[0].action;
          responseTime = fallback[0].response_time;
        }
      } else {
        // Full fallback
        const fallback = scoreLocalFallback([{ features }]);
        score = fallback[0].priority_score;
        tierName = fallback[0].tier;
        action = fallback[0].action;
        responseTime = fallback[0].response_time;
      }

      results.push({
        offerId: offer._id,
        productName: offer.productId?.productName || "Unknown",
        productImage: offer.productId?.image || "",
        category: offer.productId?.category || "",
        price: offer.price,
        currentStock: offer.stock,
        score: Math.round(score * 10000) / 10000,
        tier: tierName,
        action,
        responseTime,
        weightsUsed: weightsUsed || null,
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

    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => { r.rank = i + 1; });

    const summary = {
      total: results.length,
      critical: results.filter(r => r.tier === "CRITICAL").length,
      high: results.filter(r => r.tier === "HIGH").length,
      medium: results.filter(r => r.tier === "MEDIUM").length,
      low: results.filter(r => r.tier === "LOW").length,
    };

    res.json({ success: true, data: results, summary, scoringMode });
  } catch (error) {
    console.error("❌ getSellerRestockPriorities error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
}
