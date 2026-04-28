import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/orders/seller/me`;

function getToken() {
  return localStorage.getItem("token");
}

export async function fetchMySellerOrders() {
  const res = await fetch(BASE_URL, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to load seller orders");
  return data;
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

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to submit packing proof");
  return data;
}

export async function getSellerQr(orderId) {
  const res = await fetch(`${BASE_URL}/${orderId}/seller-qr`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to generate seller QR");
  return data;
}
