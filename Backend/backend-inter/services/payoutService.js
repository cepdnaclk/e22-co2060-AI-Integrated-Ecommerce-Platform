/**
 * ======================================================
 * PAYOUT SERVICE
 * ======================================================
 */

import { randomUUID } from "crypto";
import Order from "../models/order.js";
import Seller from "../models/seller.js";
import SellerPayout from "../models/sellerPayout.js";
import JournalEntry from "../models/journalEntry.js";
import { PAYOUT_POLICY } from "../constants/payoutPolicy.js";
import { onSellerPayout } from "./accountingService.js";
import { initiateBankTransfer } from "./bankTransferService.js";
import { ACCOUNT_CODES } from "../constants/accounting.js";

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Calculates the current Seller Payable balance for a specific order by 
 * aggregating all journal entries that hit the SELLER_PAYABLE account (2010).
 */
export async function getOrderPayableBalance(orderId) {
  const journals = await JournalEntry.find({ 
    orderId, 
    "lines.accountCode": ACCOUNT_CODES.SELLER_PAYABLE 
  });
  
  let balance = 0;
  for (const j of journals) {
    for (const l of j.lines) {
      if (l.accountCode === ACCOUNT_CODES.SELLER_PAYABLE) {
        balance += (l.credit || 0);
        balance -= (l.debit || 0);
      }
    }
  }
  return round2(balance);
}

/**
 * Identify all orders that are eligible for payout.
 */
export async function getEligibleSellerPayouts() {
  const protectionCutoff = new Date();
  protectionCutoff.setDate(protectionCutoff.getDate() - PAYOUT_POLICY.PAYOUT_PROTECTION_DAYS);

  // 1. Find orders that might be eligible
  const orders = await Order.find({
    status: "delivered",
    paymentStatus: "paid",
    gatewaySettlementStatus: "settled",
    deliveredAt: { $lte: protectionCutoff }
  });

  const eligibleOrders = [];

  for (const order of orders) {
    // Check if payout already exists for this order (prevent double batching)
    const existingPayout = await SellerPayout.findOne({
      orderIds: order._id
    });

    if (existingPayout && ["BATCHED", "PROCESSING", "PAID", "RETRY_PENDING"].includes(existingPayout.status)) {
      continue;
    }

    // Active return or active dispute blocks payout
    if (order.activeReturn || order.activeDispute) {
      continue;
    }

    // Verify Seller is active and bank is valid
    const seller = await Seller.findById(order.sellerId);
    if (!seller || !seller.isActive) continue;
    
    const bank = seller.bankDetails;
    if (!bank || !bank.isVerified || !bank.accountNumber || !bank.bankName) continue;

    // 2. Check payable balance (handles partial refunds properly)
    const payableBalance = await getOrderPayableBalance(order.orderId || order._id.toString());

    if (payableBalance > 0) {
      eligibleOrders.push({
        order,
        payableBalance
      });
    }
  }

  return eligibleOrders;
}

/**
 * Create batches for eligible orders, respecting the threshold.
 */
export async function createPayoutBatch() {
  const eligibleItems = await getEligibleSellerPayouts();
  
  // Group by seller
  const sellerGroups = {};
  for (const item of eligibleItems) {
    const sId = item.order.sellerId.toString();
    if (!sellerGroups[sId]) {
      sellerGroups[sId] = {
        sellerId: sId,
        orderIds: [],
        totalAmount: 0,
        orders: []
      };
    }
    sellerGroups[sId].orderIds.push(item.order._id);
    sellerGroups[sId].orders.push(item.order);
    sellerGroups[sId].totalAmount += item.payableBalance;
  }

  const batches = [];

  for (const sId in sellerGroups) {
    const group = sellerGroups[sId];
    const amount = round2(group.totalAmount);
    
    if (amount >= PAYOUT_POLICY.MINIMUM_PAYOUT_AMOUNT) {
      const payoutId = `PAYOUT-${Date.now()}-${sId.substring(0, 6)}`;
      const idempotencyKey = `BATCH-${payoutId}`;

      try {
        const batch = new SellerPayout({
          payoutId,
          sellerId: sId,
          orderIds: group.orderIds,
          amount,
          status: "BATCHED",
          batchedAt: new Date(),
          idempotencyKey
        });
        await batch.save();
        batches.push(batch);
      } catch (err) {
        if (err.code === 11000) {
          // Idempotency constraint hit
          console.log(`⚠️ Payout batch ${payoutId} already exists.`);
        } else {
          throw err;
        }
      }
    }
  }

  return batches;
}

/**
 * Process a batch via bank transfer.
 */
export async function processSellerPayout(payoutId) {
  const payout = await SellerPayout.findOne({ payoutId });
  
  if (!payout) throw new Error("Payout not found");
  if (payout.status === "PAID") return payout; // Idempotent success
  
  payout.status = "PROCESSING";
  payout.processingAt = new Date();
  await payout.save();

  try {
    const transferResult = await initiateBankTransfer(
      payout.sellerId,
      payout.amount,
      payout.currency
    );

    if (transferResult.success) {
      return await completeSellerPayout(payout, transferResult.bankTransferReference);
    } else {
      return await failSellerPayout(payout, transferResult.failureReason || "Bank transfer failed");
    }
  } catch (error) {
    return await failSellerPayout(payout, error.message);
  }
}

/**
 * Finalize success: update payout record and create accounting journal.
 */
export async function completeSellerPayout(payout, bankReference) {
  payout.status = "PAID";
  payout.paidAt = new Date();
  payout.bankTransferReference = bankReference;
  
  // We use the first order's details to satisfy the onSellerPayout signature, 
  // but really we are clearing the batched amount.
  // We can pass a mock order object to reuse the existing accountingService function safely.
  const mockOrder = {
    orderId: `BATCH-${payout.payoutId}`,
    sellerId: payout.sellerId
  };

  await onSellerPayout(mockOrder, payout.amount);

  await payout.save();
  return payout;
}

/**
 * Finalize failure: keep Seller Payable outstanding and mark RETRY_PENDING.
 */
export async function failSellerPayout(payout, reason) {
  payout.status = "RETRY_PENDING";
  payout.failedAt = new Date();
  payout.failureReason = reason;
  await payout.save();
  return payout;
}
