// src/services/productService.js
import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/products`;

export const fetchProducts = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}?${query}`);

    // ❌ Backend error
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Server error");
    }

    const data = await response.json();

    // ❌ Unexpected data shape
    if (!data || !Array.isArray(data.products)) {
      throw new Error("Invalid API response format");
    }

    return data;
  } catch (error) {
    console.error("❌ fetchProducts failed:", error.message);

    // ✅ Always return safe fallback
    return {
      products: [],
      totalProducts: 0,
      error: error.message
    };
  }
};

export const fetchProductDetails = async (productId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/products/${productId}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch product details");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ fetchProductDetails error:", error);
    throw error;
  }
};

/**
 * ✅ CREATE PRODUCT (ADMIN)
 * POST /api/products
 * payload: { productName, category, brand, description, image }
 */
export const createProduct = async (payload) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create product");
    return data;
  } catch (error) {
    console.error("❌ createProduct error:", error);
    throw error;
  }
};

/**
 * ✅ CREATE PRODUCT VARIANT (ADMIN)
 * POST /api/products/:productId/variants
 * payload: { variantName, color, storage, size, image, attributes }
 */
export const createProductVariant = async (productId, payload) => {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}/${productId}/variants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to create variant");
    return data;
  } catch (error) {
    console.error("❌ createProductVariant error:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN-ONLY product management (uses /api/admin/products)
// ─────────────────────────────────────────────────────────────────

const ADMIN_URL = `${API_BASE_URL}/api/admin/products`;

const adminHeaders = () => {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

/**
 * GET all products for admin panel (with variant counts)
 */
export const fetchAdminProducts = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${ADMIN_URL}?${query}`, { headers: adminHeaders() });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed to fetch products"); }
  return res.json();
};

/**
 * UPDATE product by id
 */
export const updateProduct = async (id, payload) => {
  const res = await fetch(`${ADMIN_URL}/${id}`, { method: "PUT", headers: adminHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update product");
  return data;
};

/**
 * DELETE product by id
 */
export const deleteProduct = async (id) => {
  const res = await fetch(`${ADMIN_URL}/${id}`, { method: "DELETE", headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete product");
  return data;
};

/**
 * GET all variants for a product (admin)
 */
export const fetchVariantsByProduct = async (productId) => {
  const res = await fetch(`${ADMIN_URL}/${productId}/variants`, { headers: adminHeaders() });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed to fetch variants"); }
  return res.json();
};

/**
 * CREATE variant for a product (admin)
 */
export const adminCreateVariant = async (productId, payload) => {
  const res = await fetch(`${ADMIN_URL}/${productId}/variants`, { method: "POST", headers: adminHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create variant");
  return data;
};

/**
 * UPDATE variant by id (admin)
 */
export const updateVariant = async (productId, variantId, payload) => {
  const res = await fetch(`${ADMIN_URL}/${productId}/variants/${variantId}`, { method: "PUT", headers: adminHeaders(), body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update variant");
  return data;
};

/**
 * DELETE variant by id (admin)
 */
export const deleteVariant = async (productId, variantId) => {
  const res = await fetch(`${ADMIN_URL}/${productId}/variants/${variantId}`, { method: "DELETE", headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete variant");
  return data;
};