import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/payment`;

/**
 * Initiate PayHere Payment Checkout
 * POST /api/payment/create
 *
 * @param {string} token - User JWT token
 * @param {Object} payload - { shippingAddress, deliveryCharge }
 * @returns {Promise<Object>} Returns { message, payhere, orders }
 */
export const createPayHerePayment = async (token, payload = {}) => {
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
    throw new Error(data.message || "Failed to initialize PayHere payment");
  }

  return data;
};

/**
 * Fetch Payment Status from Backend DB
 * GET /api/payment/status/:orderId
 *
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
export const getPaymentStatus = async (orderId) => {
  const res = await fetch(`${BASE_URL}/status/${orderId}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch payment status");
  }
  return data;
};

/**
 * 🧪 Simulate Successful Payment (Dev Only)
 * POST /api/payment/test-success
 * 
 * @param {string} orderId 
 * @returns {Promise<Object>}
 */
export const simulateTestPayment = async (orderId) => {
  const res = await fetch(`${BASE_URL}/test-success`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to simulate payment");
  }

  return data;
};

/**
 * Programmatically create an HTML form and submit to PayHere Checkout URL
 *
 * @param {Object} payhere - PayHere configuration returned from backend
 */
export const submitPayHereForm = (payhere) => {
  if (!payhere || !payhere.checkoutUrl) {
    throw new Error("Invalid PayHere parameters");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = payhere.checkoutUrl;
  form.style.display = "none";

  const fields = [
    "merchant_id",
    "return_url",
    "cancel_url",
    "notify_url",
    "order_id",
    "items",
    "amount",
    "currency",
    "hash",
    "first_name",
    "last_name",
    "email",
    "phone",
    "address",
    "city",
    "country"
  ];

  fields.forEach((field) => {
    if (payhere[field] !== undefined && payhere[field] !== null) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = field;
      input.value = payhere[field];
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);
  form.submit();
};
