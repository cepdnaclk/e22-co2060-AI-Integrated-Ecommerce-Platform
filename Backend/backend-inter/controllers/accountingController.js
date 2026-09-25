/**
 * ======================================================
 * ACCOUNTING CONTROLLER — REST API for Bookkeeping
 * ======================================================
 *
 * Endpoints:
 *   Commission Policy CRUD:
 *     GET    /api/accounting/commission             — get active policy
 *     POST   /api/accounting/commission             — create/update policy
 *
 *   Journal Queries:
 *     GET    /api/accounting/journal                — list journals (paginated)
 *     GET    /api/accounting/journal/:orderId       — journals for a specific order
 *
 *   Settlement:
 *     POST   /api/accounting/settle/:orderId        — trigger marketplace settlement
 *
 *   Dashboard:
 *     GET    /api/accounting/summary                — revenue/commission summary
 * ======================================================
 */

import CommissionPolicy from "../models/commissionPolicy.js";
import JournalEntry from "../models/journalEntry.js";
import orderModel from "../models/order.js";
import {
  getActiveCommissionRate,
  onSellerPayout
} from "../services/accountingService.js";

// ─── Commission Policy ───────────────────────────────

/**
 * GET /api/accounting/commission
 * Returns the currently active commission policy.
 */
export async function getCommissionPolicy(req, res) {
  try {
    const rate = await getActiveCommissionRate();
    const now = new Date();
    const policy = await CommissionPolicy.findOne({
      isActive: true,
      effectiveFrom: { $lte: now },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }]
    }).sort({ effectiveFrom: -1 });

    return res.json({
      rate,
      policy: policy || { rate, name: "Default (fallback)", isActive: true }
    });
  } catch (error) {
    console.error("❌ getCommissionPolicy error:", error.message);
    return res.status(500).json({ message: "Error fetching commission policy" });
  }
}

/**
 * POST /api/accounting/commission
 * Create or update a commission policy.
 * Body: { name, rate, effectiveFrom?, effectiveTo? }
 */
export async function setCommissionPolicy(req, res) {
  try {
    const { name, rate, effectiveFrom, effectiveTo } = req.body;

    if (rate === undefined || rate === null || rate < 0 || rate > 100) {
      return res.status(400).json({ message: "Rate must be between 0 and 100" });
    }

    // Deactivate existing active policies
    await CommissionPolicy.updateMany(
      { isActive: true },
      { $set: { isActive: false } }
    );

    const policy = await CommissionPolicy.create({
      name: name || `Commission ${rate}%`,
      rate,
      isActive: true,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      createdBy: req.user?.id || null
    });

    return res.status(201).json({
      message: "Commission policy created",
      policy
    });
  } catch (error) {
    console.error("❌ setCommissionPolicy error:", error.message);
    return res.status(500).json({ message: "Error setting commission policy" });
  }
}

// ─── Journal Queries ──────────────────────────────────

/**
 * GET /api/accounting/journal
 * Paginated list of journal entries.
 * Query: ?page=1&limit=20&eventType=ORDER_PAID&sellerId=...
 */
export async function listJournals(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.eventType) filter.eventType = req.query.eventType;
    if (req.query.sellerId) filter.sellerId = req.query.sellerId;
    if (req.query.status) filter.status = req.query.status;

    const [journals, total] = await Promise.all([
      JournalEntry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      JournalEntry.countDocuments(filter)
    ]);

    return res.json({
      journals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("❌ listJournals error:", error.message);
    return res.status(500).json({ message: "Error listing journals" });
  }
}

/**
 * GET /api/accounting/journal/:orderId
 * All journal entries for a specific order.
 */
export async function getOrderJournals(req, res) {
  try {
    const { orderId } = req.params;
    const journals = await JournalEntry.find({ orderId }).sort({ createdAt: 1 });

    return res.json({ orderId, journals });
  } catch (error) {
    console.error("❌ getOrderJournals error:", error.message);
    return res.status(500).json({ message: "Error fetching order journals" });
  }
}

// ─── Settlement ───────────────────────────────────────

/**
 * POST /api/accounting/settle/:orderId
 * Trigger marketplace settlement for all paid orders under an orderId.
 * This calculates commission and records the settlement journal.
 */
export async function settleOrder(req, res) {
  try {
    const { orderId } = req.params;

    const orders = await orderModel.find({
      $or: [{ orderId }, { _id: orderId }],
      paymentStatus: "paid"
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No paid orders found for settlement" });
    }

    const commissionRate = await getActiveCommissionRate();
    const results = [];

    for (const order of orders) {
      try {
        const paidJournal = await JournalEntry.findOne({
          orderId: order.orderId || order._id.toString(),
          eventType: "ORDER_PAID"
        });

        if (!paidJournal || !paidJournal.metadata || paidJournal.metadata.sellerPayout === undefined) {
          throw new Error("ORDER_PAID journal missing or lacks sellerPayout metadata");
        }

        const sellerPayout = paidJournal.metadata.sellerPayout;
        const journal = await onSellerPayout(order, sellerPayout);
        
        results.push({
          orderId: order.orderId || order._id.toString(),
          sellerId: order.sellerId.toString(),
          status: "settled",
          journal: journal._id,
          sellerPayout: journal.metadata?.sellerPayout
        });
      } catch (err) {
        // If already settled (idempotent), report it
        results.push({
          orderId: order.orderId || order._id.toString(),
          sellerId: order.sellerId.toString(),
          status: err.message.includes("already") ? "already_settled" : "error",
          error: err.message
        });
      }
    }

    return res.json({
      message: "Settlement processed",
      commissionRate,
      results
    });
  } catch (error) {
    console.error("❌ settleOrder error:", error.message);
    return res.status(500).json({ message: "Error processing settlement" });
  }
}

// ─── Dashboard Summary ────────────────────────────────

/**
 * GET /api/accounting/summary
 * Returns aggregated revenue, commission, and settlement data.
 * Query: ?from=2024-01-01&to=2024-12-31&sellerId=...
 */
export async function getAccountingSummary(req, res) {
  try {
    const matchFilter = { status: "COMMITTED" };

    if (req.query.from || req.query.to) {
      matchFilter.createdAt = {};
      if (req.query.from) matchFilter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) matchFilter.createdAt.$lte = new Date(req.query.to);
    }
    if (req.query.sellerId) {
      matchFilter.sellerId = req.query.sellerId;
    }

    // Aggregate by eventType
    const summary = await JournalEntry.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$eventType",
          count: { $sum: 1 },
          totalDebit: {
            $sum: { $reduce: { input: "$lines", initialValue: 0, in: { $add: ["$$value", "$$this.debit"] } } }
          },
          totalCredit: {
            $sum: { $reduce: { input: "$lines", initialValue: 0, in: { $add: ["$$value", "$$this.credit"] } } }
          }
        }
      }
    ]);

    // Extract key metrics
    const paidEntry = summary.find(s => s._id === "ORDER_PAID");
    const settlementEntry = summary.find(s => s._id === "SELLER_PAYOUT");

    // Get total commission from ORDER_PAID metadata
    const commissionAgg = await JournalEntry.aggregate([
      { $match: { ...matchFilter, eventType: "ORDER_PAID" } },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$metadata.commissionAmount" },
          totalSellerPayouts: { $sum: "$metadata.sellerPayout" },
          totalRevenue: { $sum: "$metadata.totalAmount" }
        }
      }
    ]);

    const commissionData = commissionAgg[0] || {
      totalCommission: 0,
      totalSellerPayouts: 0,
      totalRevenue: 0
    };

    return res.json({
      summary: {
        paymentsReceived: {
          count: paidEntry?.count || 0,
          totalAmount: paidEntry?.totalDebit || 0
        },
        settlements: {
          count: settlementEntry?.count || 0,
          totalCommission: commissionData.totalCommission,
          totalSellerPayouts: commissionData.totalSellerPayouts,
          totalRevenue: commissionData.totalRevenue
        }
      },
      byEventType: summary,
      currentCommissionRate: await getActiveCommissionRate()
    });
  } catch (error) {
    console.error("❌ getAccountingSummary error:", error.message);
    return res.status(500).json({ message: "Error fetching summary" });
  }
}
