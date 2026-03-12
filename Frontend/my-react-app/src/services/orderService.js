import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/orders`;

// ─────────────────────────────────────
// 📦 PLACE ORDER (CHECKOUT)
// Body: { shippingAddress: { fullName, phone, street, city, postalCode } }
// ─────────────────────────────────────
export const placeOrder = async (token, shippingAddress) => {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shippingAddress }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to place order");
    return data;
};

// ─────────────────────────────────────
// 📋 GET MY ORDERS (BUYER)
// ─────────────────────────────────────
export const getMyOrders = async (token) => {
    try {
        const res = await fetch(`${BASE_URL}/my`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch orders");
        return await res.json();
    } catch (err) {
        console.error("❌ getMyOrders error:", err.message);
        return [];
    }
};
