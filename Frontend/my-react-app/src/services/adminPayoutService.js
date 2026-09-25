/**
 * ======================================================
 * ADMIN PAYOUT SERVICE
 * ======================================================
 * Centralized API layer for the Admin Payout Dashboard.
 *
 * All requests are authenticated with the admin JWT token
 * stored in localStorage (adminToken or token), following
 * the existing BEETA admin service pattern.
 *
 * Base endpoint: /api/accounting/payouts
 *
 * SECURITY NOTE:
 * - Bank details are NOT stored or cached in the frontend.
 * - Accounting journal entries are NEVER created here.
 * - The backend is the sole authority for payout eligibility
 *   and accounting.
 * ======================================================
 */

import API_BASE_URL from "../config/api";

const BASE = `${API_BASE_URL}/api/accounting/payouts`;

/**
 * Returns the admin JWT Bearer header.
 * Mirrors the pattern used throughout AdminDashboard and productService.
 */
function adminHeaders() {
  const token =
    localStorage.getItem("adminToken") || localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Parse response and throw standardised errors.
 */
async function handleResponse(res) {
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (res.status === 403) {
    throw new Error("FORBIDDEN");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Server error (${res.status})`);
  }
  return data;
}

/**
 * GET /api/accounting/payouts
 * Returns all SellerPayout records sorted newest-first.
 * @returns {Promise<Array>} array of payout records
 */
export async function getPayouts() {
  const res = await fetch(BASE, { headers: adminHeaders() });
  return handleResponse(res);
}

/**
 * GET /api/accounting/payouts/eligible
 * Returns live-computed orders eligible for payout but not yet batched.
 * Shape: [{ order: {...}, payableBalance: number }]
 * @returns {Promise<Array>}
 */
export async function getEligiblePayouts() {
  const res = await fetch(`${BASE}/eligible`, { headers: adminHeaders() });
  return handleResponse(res);
}

/**
 * GET /api/accounting/payouts/:id
 * Returns a single payout record by payoutId string.
 * @param {string} payoutId
 * @returns {Promise<Object>}
 */
export async function getPayoutById(payoutId) {
  const res = await fetch(`${BASE}/${encodeURIComponent(payoutId)}`, {
    headers: adminHeaders(),
  });
  return handleResponse(res);
}

/**
 * POST /api/accounting/payouts/run
 * Batches all eligible payouts and initiates bank transfers.
 * The backend handles: eligibility validation, bank transfer,
 * idempotency, and accounting journal creation.
 * The frontend NEVER creates accounting entries.
 * @returns {Promise<{ message: string, results: Array }>}
 */
export async function runPayouts() {
  const res = await fetch(`${BASE}/run`, {
    method: "POST",
    headers: adminHeaders(),
  });
  return handleResponse(res);
}

/**
 * POST /api/accounting/payouts/:id/retry
 * Retries a FAILED or RETRY_PENDING payout.
 * Backend is responsible for idempotency and accounting.
 * @param {string} payoutId
 * @returns {Promise<{ message: string, result: Object }>}
 */
export async function retryPayout(payoutId) {
  const res = await fetch(
    `${BASE}/${encodeURIComponent(payoutId)}/retry`,
    {
      method: "POST",
      headers: adminHeaders(),
    }
  );
  return handleResponse(res);
}
