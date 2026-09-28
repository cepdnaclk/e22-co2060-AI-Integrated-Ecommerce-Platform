/**
 * ======================================================
 * ACCOUNTING SERVICE — Double-Entry Bookkeeping Engine
 * ======================================================
 *
 * Core accounting logic for the Beeta marketplace:
 *   - Idempotent journal entry creation (keyed by eventId + eventType)
 *   - Double-entry balance validation (debits == credits)
 *   - Commission calculation on productTotal ONLY (not delivery)
 *   - Marketplace settlement journal generation
 *
 * Architecture:
 *   This is a service module inside backend-inter.
 *   It is called by the payment controller when PayHere confirms payment.
 * ======================================================
 */

import { randomUUID } from "crypto";
import JournalEntry from "../models/journalEntry.js";
import CommissionPolicy from "../models/commissionPolicy.js";
import { ACCOUNT_CODES, EVENT_TYPES } from "../constants/accounting.js";

// ─── Helpers ──────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Validate that total debits === total credits in a set of journal lines.
 * Throws if the journal doesn't balance.
 */
function assertBalanced(lines) {
  const totalDebit = round2(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (l.credit || 0), 0));
  if (totalDebit !== totalCredit) {
    throw new Error(
      `Journal does not balance: debits=${totalDebit} credits=${totalCredit}`
    );
  }
}

// ─── Commission Policy ───────────────────────────────

/**
 * Get the currently active commission rate (%).
 * Falls back to 10% if no policy exists.
 */
export async function getActiveCommissionRate() {
  const now = new Date();
  const policy = await CommissionPolicy.findOne({
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: now } }]
  }).sort({ effectiveFrom: -1 });

  return policy ? policy.rate : 10; // default 10%
}

// ─── Journal Entry Writer ─────────────────────────────

/**
 * Create a journal entry idempotently.
 *
 * If a journal with the same (eventId, eventType) already exists and
 * is COMMITTED, the function returns the existing entry (no duplicate).
 *
 * @param {Object} params
 * @param {string} params.eventId      — unique event identifier
 * @param {string} params.eventType    — one of EVENT_TYPES.*
 * @param {string} params.orderId      — related order ID (optional)
 * @param {string} params.paymentReference — PayHere payment ID
 * @param {string} params.sellerId     — related seller ID (optional)
 * @param {Array}  params.lines        — journal line items [{accountCode, accountName, debit, credit, description}]
 * @param {Object} params.metadata     — arbitrary metadata
 * @returns {Object} the created or existing JournalEntry document
 */
export async function recordJournal({
  eventId,
  eventType,
  orderId,
  paymentReference,
  sellerId,
  lines,
  metadata
}) {
  // 1. Idempotency check
  const existing = await JournalEntry.findOne({ eventId, eventType });
  if (existing && existing.status === "COMMITTED") {
    console.log(`📒 Journal already committed for ${eventType}:${eventId}`);
    return existing;
  }

  // 2. Validate balance
  assertBalanced(lines);

  // 3. Create or update
  const transactionId = randomUUID();
  const entry = existing || new JournalEntry();

  entry.transactionId = transactionId;
  entry.eventId = eventId;
  entry.eventType = eventType;
  entry.orderId = orderId || null;
  entry.paymentReference = paymentReference || null;
  entry.sellerId = sellerId || null;
  entry.lines = lines;
  entry.metadata = metadata || {};
  entry.status = "COMMITTED";
  entry.errorReason = null;

  await entry.save();
  console.log(`📒 Journal committed: ${eventType} txn=${transactionId}`);
  return entry;
}

// ─── Event Handlers ───────────────────────────────────

/**
 * Record the double-entry journal when an order is paid.
 *
 * IMPORTANT: Commission is calculated on productTotal ONLY,
 * not on delivery charges.
 *
 * Journal for ORDER_PAID:
 *   DR  Gateway Balance (1015)                totalAmount
 *   CR  Seller Payable (2010)                 productTotal - commission
 *   CR  Marketplace Commission Revenue (4020) commission
 *   CR  Shipping Revenue (4010)               deliveryCharge
 *
 * @param {Object} order — Mongoose order document (must have productTotal, deliveryCharge, totalAmount)
 * @param {string} paymentId — PayHere payment ID
 */
export async function onOrderPaid(order, paymentId) {
  const eventId = `${order.orderId || order._id.toString()}-${order.sellerId.toString()}`;
  const productTotal = round2(order.productTotal);
  const deliveryCharge = round2(order.deliveryCharge || 0);
  const totalAmount = round2(order.totalAmount);

  const commissionRate = await getActiveCommissionRate();
  const commissionAmount = round2((productTotal * commissionRate) / 100);
  const sellerPayout = round2(productTotal - commissionAmount);

  const lines = [
    {
      accountCode: ACCOUNT_CODES.GATEWAY_BALANCE,
      accountName: "PayHere Gateway Balance",
      debit: totalAmount,
      credit: 0,
      description: `Payment received for order ${order.orderId}`
    },
    {
      accountCode: ACCOUNT_CODES.SELLER_PAYABLE,
      accountName: "Seller Payable",
      debit: 0,
      credit: sellerPayout,
      description: `Amount owed to seller for order ${order.orderId}`
    },
    {
      accountCode: ACCOUNT_CODES.MARKETPLACE_COMMISSION_REVENUE,
      accountName: "Marketplace Commission Revenue",
      debit: 0,
      credit: commissionAmount,
      description: `${commissionRate}% commission on product total ${productTotal}`
    }
  ];

  // Only add shipping revenue line if there's a delivery charge
  if (deliveryCharge > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.SHIPPING_REVENUE,
      accountName: "Shipping Revenue Recovered",
      debit: 0,
      credit: deliveryCharge,
      description: `Delivery charge for order ${order.orderId}`
    });
  }

  return recordJournal({
    eventId,
    eventType: EVENT_TYPES.ORDER_PAID,
    orderId: order.orderId || order._id.toString(),
    paymentReference: paymentId,
    sellerId: order.sellerId.toString(),
    lines,
    metadata: {
      productTotal,
      deliveryCharge,
      totalAmount,
      commissionRate,
      commissionAmount,
      sellerPayout,
      itemCount: order.items?.length || 0
    }
  });
}

/**
 * Record the settlement journal when marketplace pays out the seller.
 *
 * Journal for SELLER_PAYOUT:
 *   DR  Seller Payable (2010)          sellerPayout       — amount owed to seller
 *   CR  Bank Account - Operating (1010) sellerPayout       — cash disbursed from bank
 *
 * @param {Object} order — Mongoose order document
 * @param {number} sellerPayout — amount being paid to the seller
 */
export async function onSellerPayout(order, sellerPayout) {
  const eventId = `payout-${order.orderId || order._id.toString()}-${order.sellerId.toString()}`;
  const payoutAmount = round2(sellerPayout);

  const lines = [
    {
      accountCode: ACCOUNT_CODES.SELLER_PAYABLE,
      accountName: "Seller Payable",
      debit: payoutAmount,
      credit: 0,
      description: `Payout to seller ${order.sellerId} for order ${order.orderId}`
    },
    {
      accountCode: ACCOUNT_CODES.BANK_OPERATING,
      accountName: "Bank Account - Operating",
      debit: 0,
      credit: payoutAmount,
      description: `Bank disbursement to seller ${order.sellerId}`
    }
  ];

  return recordJournal({
    eventId,
    eventType: EVENT_TYPES.SELLER_PAYOUT,
    orderId: order.orderId || order._id.toString(),
    sellerId: order.sellerId.toString(),
    lines,
    metadata: {
      sellerPayout: payoutAmount
    }
  });
}

/**
 * Record a gateway settlement (moving funds from gateway balance to bank).
 *
 * Journal for GATEWAY_SETTLEMENT:
 *   DR Bank Account - Operating (1010)
 *   CR PayHere Gateway Balance (1015)
 */
export async function onGatewaySettlement(settlementId, amount) {
  const eventId = `gw-settle-${settlementId}`;
  const settleAmount = round2(amount);

  const lines = [
    {
      accountCode: ACCOUNT_CODES.BANK_OPERATING,
      accountName: "Bank Account - Operating",
      debit: settleAmount,
      credit: 0,
      description: `Gateway settlement ${settlementId}`
    },
    {
      accountCode: ACCOUNT_CODES.GATEWAY_BALANCE,
      accountName: "PayHere Gateway Balance",
      debit: 0,
      credit: settleAmount,
      description: `Gateway settlement ${settlementId}`
    }
  ];

  return recordJournal({
    eventId,
    eventType: EVENT_TYPES.GATEWAY_SETTLEMENT,
    lines,
    metadata: { settleAmount }
  });
}

/**
 * Record a refund journal entry.
 *
 * Journal for REFUND_ISSUED:
 *   DR  Customer Refunds Expense (6070)  refundAmount
 *   CR  Gateway Balance (1015)           refundAmount
 */
export async function onRefundIssued(order, refundAmount, reason) {
  const eventId = `refund-${order.orderId || order._id.toString()}-${Date.now()}`;

  const lines = [
    {
      accountCode: ACCOUNT_CODES.CUSTOMER_REFUNDS_EXPENSE,
      accountName: "Customer Refunds Expense",
      debit: round2(refundAmount),
      credit: 0,
      description: `Refund for order ${order.orderId}: ${reason || "customer refund"}`
    },
    {
      accountCode: ACCOUNT_CODES.GATEWAY_BALANCE,
      accountName: "PayHere Gateway Balance",
      debit: 0,
      credit: round2(refundAmount),
      description: `Refund disbursed for order ${order.orderId}`
    }
  ];

  return recordJournal({
    eventId,
    eventType: EVENT_TYPES.REFUND_ISSUED,
    orderId: order.orderId || order._id.toString(),
    sellerId: order.sellerId?.toString(),
    lines,
    metadata: { refundAmount, reason }
  });
}
