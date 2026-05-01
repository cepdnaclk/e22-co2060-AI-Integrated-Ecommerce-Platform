import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/admin/orders`;

function getAdminToken() {
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAdminToken()}`,
  };
}

/**
 * Fetch all orders with optional filters
 */
export const fetchAllOrders = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}?${query}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
};

/**
 * Fetch order statistics
 */
export const fetchOrderStats = async () => {
  const res = await fetch(`${BASE_URL}/stats`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch order stats");
  return res.json();
};

/**
 * Fetch a single order by ID
 */
export const fetchOrderById = async (orderId) => {
  const res = await fetch(`${BASE_URL}/${orderId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId, status) => {
  const res = await fetch(`${BASE_URL}/${orderId}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update order status");
  return res.json();
};

/**
 * Approve or reject seller packing proof (controls seller QR readiness)
 */
export const verifySellerQr = async (orderId, action, notes = "") => {
  const res = await fetch(`${BASE_URL}/${orderId}/seller-qr/verify`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ action, notes }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to verify seller proof");
  return data;
};
