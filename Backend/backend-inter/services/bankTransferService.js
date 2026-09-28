/**
 * ======================================================
 * BANK TRANSFER SERVICE (MOCK ABSTRACTION)
 * ======================================================
 *
 * This provides a clean interface for executing external
 * bank transfers to sellers. In a production environment,
 * this would integrate with a real bank API or a payout
 * provider (like PayHere Payouts or a local bank API).
 */

import { randomUUID } from "crypto";

export async function initiateBankTransfer(sellerId, amount, currency = "LKR") {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In development/testing, we simulate success for most cases,
  // but fail if the amount is exactly 999 for testing purposes.
  if (amount === 999) {
    return {
      success: false,
      failureReason: "Simulated bank rejection (amount = 999)",
      bankTransferReference: null
    };
  }

  // Simulate successful transfer
  const ref = `BANK-REF-${randomUUID().substring(0, 8).toUpperCase()}`;
  return {
    success: true,
    failureReason: null,
    bankTransferReference: ref
  };
}
