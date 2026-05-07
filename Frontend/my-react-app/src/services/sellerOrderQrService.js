import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/orders/seller/me`;

function getToken() {
  return localStorage.getItem("token");
}

async function parseApiResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  return {
    data,
    raw,
    isJson: contentType.includes("application/json"),
  };
}

function getApiErrorMessage(parsed, fallbackMessage, statusCode) {
  if (parsed?.data?.message) return parsed.data.message;
  if (parsed?.raw && !parsed.isJson) {
    return `${fallbackMessage} (server returned non-JSON, status ${statusCode})`;
  }
  return fallbackMessage;
}

export async function fetchMySellerOrders() {
  const res = await fetch(BASE_URL, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const parsed = await parseApiResponse(res);
  if (!res.ok) throw new Error(getApiErrorMessage(parsed, "Failed to load seller orders", res.status));
  return Array.isArray(parsed.data) ? parsed.data : [];
}

export async function getMySellerOrderDetails(orderId) {
  const res = await fetch(`${BASE_URL}/${orderId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const parsed = await parseApiResponse(res);

  if (res.ok) {
    return parsed.data;
  }

  // Fallback for backends that do not yet expose GET /seller/me/:orderId
  if (res.status === 404) {
    const orders = await fetchMySellerOrders();
    const matchedOrder = orders.find((order) => `${order?._id}` === `${orderId}`);
    if (matchedOrder) return matchedOrder;
    throw new Error("Order details not found for this seller");
  }

  throw new Error(getApiErrorMessage(parsed, "Failed to load seller order details", res.status));
}

export async function submitPackingProof(orderId, { productName, skuOrImei, proofImage }) {
  const formData = new FormData();
  formData.append("productName", productName);
  formData.append("skuOrImei", skuOrImei);
  formData.append("proofImage", proofImage);

  const res = await fetch(`${BASE_URL}/${orderId}/packing-proof`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });

  const parsed = await parseApiResponse(res);
  if (!res.ok) throw new Error(getApiErrorMessage(parsed, "Failed to submit packing proof", res.status));
  return parsed.data;
}

export async function getSellerQr(orderId) {
  const res = await fetch(`${BASE_URL}/${orderId}/seller-qr`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const parsed = await parseApiResponse(res);
  if (!res.ok) throw new Error(getApiErrorMessage(parsed, "Failed to generate seller QR", res.status));
  return parsed.data;
}
