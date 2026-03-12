import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/cart`;

// ─────────────────────────────────────
// 🛒 GET CART
// ─────────────────────────────────────
export const getCart = async (token) => {
    try {
        const res = await fetch(BASE_URL, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch cart");
        return await res.json();
    } catch (err) {
        console.error("❌ getCart error:", err.message);
        return { items: [], totalPrice: 0 };
    }
};

// ─────────────────────────────────────
// ➕ ADD TO CART
// ─────────────────────────────────────
export const addToCart = async (token, sellerOfferId, quantity = 1) => {
    const res = await fetch(`${BASE_URL}/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sellerOfferId, quantity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to add to cart");
    return data;
};

// ─────────────────────────────────────
// 🔄 UPDATE CART ITEM QUANTITY
// ─────────────────────────────────────
export const updateCartItem = async (token, sellerOfferId, quantity) => {
    const res = await fetch(`${BASE_URL}/update`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sellerOfferId, quantity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update cart");
    return data;
};

// ─────────────────────────────────────
// ❌ REMOVE CART ITEM
// ─────────────────────────────────────
export const removeCartItem = async (token, sellerOfferId) => {
    const res = await fetch(`${BASE_URL}/remove`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sellerOfferId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to remove item");
    return data;
};
