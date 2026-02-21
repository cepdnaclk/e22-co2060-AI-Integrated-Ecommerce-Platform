// src/services/productService.js
const BASE_URL = "http://localhost:3000/api/products";

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
      `http://localhost:3000/api/products/${productId}`
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