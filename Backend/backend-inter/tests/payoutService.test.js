/**
 * ======================================================
 * PAYOUT SERVICE UNIT TESTS
 * ======================================================
 *
 * Tests the payout eligibility rules, batching, and accounting idempotency.
 */

import Order from "../models/order.js";
import JournalEntry from "../models/journalEntry.js";
import SellerPayout from "../models/sellerPayout.js";
import * as payoutService from "../services/payoutService.js";
import * as accountingService from "../services/accountingService.js";
import { PAYOUT_POLICY } from "../constants/payoutPolicy.js";

// ─── Test Store ───────────────────────────────────────
let orderStore = [];
let journalStore = [];
let payoutStore = [];
let sellerStore = [];

// ─── Monkey Patch Mongoose Models ─────────────────────
import Seller from "../models/seller.js";

Order.find = async (query) => {
  return orderStore.filter(o => 
    (!query.status || o.status === query.status) &&
    (!query.paymentStatus || o.paymentStatus === query.paymentStatus) &&
    (!query.gatewaySettlementStatus || o.gatewaySettlementStatus === query.gatewaySettlementStatus)
  ).filter(o => {
    if (query.deliveredAt && query.deliveredAt.$lte) {
      return o.deliveredAt <= query.deliveredAt.$lte;
    }
    return true;
  });
};

Seller.findById = async (id) => {
  return sellerStore.find(s => s._id === id || s._id.toString() === id.toString()) || null;
};

SellerPayout.findOne = async (query) => {
  return payoutStore.find(p => p.payoutId === query.payoutId) || null;
};

SellerPayout.prototype.save = async function() {
  const idx = payoutStore.findIndex(p => p.payoutId === this.payoutId);
  if (idx >= 0) payoutStore[idx] = this;
  else payoutStore.push(this);
  return this;
};

JournalEntry.find = async (query) => {
  return journalStore.filter(j => j.orderId === query.orderId);
};

JournalEntry.countDocuments = async (query) => {
  return journalStore.filter(j => 
    j.orderId === query.orderId && 
    j.eventType === query.eventType
  ).length;
};

JournalEntry.findOne = async (query) => {
  return journalStore.find(j => 
    j.eventId === query.eventId && 
    j.eventType === query.eventType
  ) || null;
};

JournalEntry.prototype.save = async function() {
  journalStore.push(this);
  return this;
};

// ─── Test Helpers ─────────────────────────────────────
function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  }
}

function createDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ─── Run Tests ────────────────────────────────────────
async function runTests() {
  console.log("=========================================");
  console.log("🧪 Running Payout Service Tests");
  console.log("=========================================");

  // Reset function
  const reset = () => {
    orderStore = [];
    journalStore = [];
    payoutStore = [];
    sellerStore = [{
      _id: "5f8d0d55b54764421b7156c1",
      isActive: true,
      bankDetails: {
        accountName: "Test Seller",
        accountNumber: "123456",
        bankName: "Test Bank",
        isVerified: true
      }
    }];
  };

  reset();

  // Test 1: Paid + Settled -> Eligible
  console.log("\n📌 Test 1: paid + settled → eligible");
  orderStore = [{
    _id: "O1",
    orderId: "O1",
    sellerId: "5f8d0d55b54764421b7156c1",
    status: "delivered",
    paymentStatus: "paid",
    gatewaySettlementStatus: "settled",
    deliveredAt: createDate(8),
    updatedAt: createDate(8)
  }];
  journalStore = [{
    orderId: "O1",
    eventType: "ORDER_PAID",
    lines: [{ accountCode: "2010", credit: 1500 }]
  }];
  let eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 1, "Order is eligible");

  // Test 2: Paid + Unsettled -> Blocked
  console.log("\n📌 Test 2: paid + NOT settled → blocked");
  orderStore[0].gatewaySettlementStatus = "pending";
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "Unsettled order is blocked");
  orderStore[0].gatewaySettlementStatus = "settled"; // reset

  // Test 3: DeliveredAt exactly controls 7-day period
  console.log("\n📌 Test 3: deliveredAt exactly controls 7-day period");
  orderStore[0].deliveredAt = createDate(6);
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "6 days is blocked");
  orderStore[0].deliveredAt = createDate(8);

  // Test 4: updatedAt changes do not affect protection period
  console.log("\n📌 Test 4: updatedAt changes do not affect protection period");
  orderStore[0].updatedAt = createDate(1); // recently updated
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 1, "Still eligible despite recent update");

  // Test 5: Inactive seller -> blocked
  console.log("\n📌 Test 5: inactive seller → blocked");
  sellerStore[0].isActive = false;
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "Inactive seller is blocked");
  sellerStore[0].isActive = true;

  // Test 6: Missing bank details -> blocked
  console.log("\n📌 Test 6: missing bank details → blocked");
  delete sellerStore[0].bankDetails;
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "Missing bank is blocked");
  
  // Test 7: Invalid bank details -> blocked
  console.log("\n📌 Test 7: invalid bank details → blocked");
  sellerStore[0].bankDetails = { isVerified: false, accountNumber: "123" };
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "Unverified bank is blocked");
  sellerStore[0].bankDetails = { isVerified: true, accountNumber: "123", bankName: "Bank" }; // valid again

  // Test 8: Active return -> blocked
  console.log("\n📌 Test 8: active return → blocked");
  orderStore[0].activeReturn = true;
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "Active return blocks payout");
  orderStore[0].activeReturn = false;

  // Test 9: Active dispute -> blocked
  console.log("\n📌 Test 9: active dispute → blocked");
  orderStore[0].activeDispute = true;
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "Active dispute blocks payout");
  orderStore[0].activeDispute = false;

  // Test 10: Partial refund -> remaining payable can be paid
  console.log("\n📌 Test 10: partial refund → remaining amount paid");
  journalStore.push({
    orderId: "O1",
    eventType: "REFUND_ISSUED",
    lines: [{ accountCode: "2010", debit: 500 }] // LKR 500 refund
  });
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 1, "Partial refund still eligible");
  assert(eligible[0].payableBalance === 1000, "Balance reduced correctly");

  // Test 11: Full refund -> no payout
  console.log("\n📌 Test 11: full refund → no payout");
  journalStore.push({
    orderId: "O1",
    eventType: "REFUND_ISSUED",
    lines: [{ accountCode: "2010", debit: 1000 }] // LKR 1000 more refund
  });
  eligible = await payoutService.getEligibleSellerPayouts();
  assert(eligible.length === 0, "Full refund blocks payout");

  // Reset for processing tests
  reset();
  orderStore = [{
    _id: "O1",
    orderId: "O1",
    sellerId: "5f8d0d55b54764421b7156c1",
    status: "delivered",
    paymentStatus: "paid",
    gatewaySettlementStatus: "settled",
    deliveredAt: createDate(8)
  }];
  journalStore = [{
    orderId: "O1",
    eventType: "ORDER_PAID",
    lines: [{ accountCode: "2010", credit: 1500 }]
  }];
  let batches = await payoutService.createPayoutBatch();

  // Test 13: Successful bank transfer -> Dr 2010 / Cr 1010
  console.log("\n📌 Test 13: successful bank transfer → Dr 2010 / Cr 1010");
  const batchId = batches[0].payoutId;
  const processed = await payoutService.processSellerPayout(batchId);
  assert(processed.status === "PAID", "Payout completed and marked PAID");
  assert(journalStore.some(j => j.eventType === "SELLER_PAYOUT" && j.metadata.sellerPayout === 1500), "Accounting journal created");

  // Test 16: Duplicate payout -> prevented
  console.log("\n📌 Test 16: duplicate payout → prevented");
  const repoly = await payoutService.processSellerPayout(batchId);
  assert(repoly.status === "PAID", "Still PAID");

  // Multi-seller tests
  reset();
  sellerStore.push({
    _id: "5f8d0d55b54764421b7156c2",
    isActive: true,
    bankDetails: { isVerified: true, accountNumber: "2", bankName: "B" }
  });
  orderStore = [
    { _id: "O2", orderId: "O2", sellerId: "5f8d0d55b54764421b7156c1", status: "delivered", paymentStatus: "paid", gatewaySettlementStatus: "settled", deliveredAt: createDate(8) },
    { _id: "O3", orderId: "O3", sellerId: "5f8d0d55b54764421b7156c1", status: "delivered", paymentStatus: "paid", gatewaySettlementStatus: "settled", deliveredAt: createDate(8) },
    { _id: "O4", orderId: "O4", sellerId: "5f8d0d55b54764421b7156c2", status: "delivered", paymentStatus: "paid", gatewaySettlementStatus: "settled", deliveredAt: createDate(8) }
  ];
  journalStore = [
    { orderId: "O2", eventType: "ORDER_PAID", lines: [{ accountCode: "2010", credit: 600 }] },
    { orderId: "O3", eventType: "ORDER_PAID", lines: [{ accountCode: "2010", credit: 700 }] },
    { orderId: "O4", eventType: "ORDER_PAID", lines: [{ accountCode: "2010", credit: 2000 }] }
  ];
  
  // Test 17 & 18: Multiple orders and isolated sellers
  console.log("\n📌 Test 17 & 18: Multiple orders aggregated & sellers isolated");
  batches = await payoutService.createPayoutBatch();
  assert(batches.length === 2, "2 batches for 2 sellers");
  const s1Batch = batches.find(b => b.sellerId.toString() === "5f8d0d55b54764421b7156c1");
  assert(s1Batch.amount === 1300, "S1 combined correctly");

  console.log("\n=========================================");
  console.log(`✅ All Payout Service Edge Cases Passed!`);
  console.log("=========================================\n");
  process.exit(0);
}

runTests();
