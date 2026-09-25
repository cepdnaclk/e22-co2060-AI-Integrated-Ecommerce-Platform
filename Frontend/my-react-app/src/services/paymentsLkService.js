import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/payments`;

/**
 * Initiate Payments.lk Checkout Session
 * POST /api/payments/create
 *
 * @param {string} token - JWT user token
 * @param {Object} payload - { shippingAddress, deliveryCharge }
 * @returns {Promise<Object>} Returns { message, orderId, checkoutId, checkoutUrl, amount, currency }
 */
export const createPaymentsLkCheckout = async (token, payload = {}) => {
  const res = await fetch(`${BASE_URL}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to initialize Payments.lk checkout");
  }

  return data;
};

/**
 * Fetch Payments.lk Payment Status from Database
 * GET /api/payments/status/:orderId
 *
 * @param {string} token - JWT user token
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
export const getPaymentsLkStatus = async (token, orderId) => {
  const res = await fetch(`${BASE_URL}/status/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch payment status");
  }

  return data;
};
