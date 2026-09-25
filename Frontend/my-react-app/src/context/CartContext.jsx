/**
 * CartContext — Global Cart State
 * ─────────────────────────────────────────────────────────────────────
 * Single source of truth for cart data across the entire app.
 * All cart-touching components (CartWidget, CartPage, ProductDetails)
 * read from and write to this context so the badge count, mini-cart
 * panel, and full cart page always stay in sync.
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
} from "../services/cartService";

/* ── Context object ────────────────────────────────────────────── */
const CartContext = createContext(null);

/* ── Provider ──────────────────────────────────────────────────── */
export function CartProvider({ children }) {
    const [cart,    setCart]    = useState({ items: [], totalPrice: 0 });
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);

    /* ── Fetch / refresh cart from backend ── */
    const refreshCart = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setCart({ items: [], totalPrice: 0 });
            setError(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await getCart(token);
            const resolved = data?.cart ?? data;
            setCart(resolved || { items: [], totalPrice: 0 });
        } catch (e) {
            // Ignore auth expiration errors here as they are handled by the central auth handler
            if (e.message?.includes("expired") || e.message?.includes("Invalid")) {
                setError(null);
                setCart({ items: [], totalPrice: 0 });
            } else {
                setError(e.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    /* Load on mount & listen for session expiration events */
    useEffect(() => {
        refreshCart();

        const handleSessionExpired = () => {
            setCart({ items: [], totalPrice: 0 });
            setError(null);
        };

        window.addEventListener("auth:session-expired", handleSessionExpired);
        return () => window.removeEventListener("auth:session-expired", handleSessionExpired);
    }, [refreshCart]);

    /* ── Add item ── */
    const addItem = useCallback(async (sellerOfferId, quantity = 1, variantId = null) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        await addToCart(token, sellerOfferId, quantity, variantId);
        await refreshCart();   // re-sync so badge reflects real backend data
    }, [refreshCart]);

    /* ── Update quantity ── */
    const updateItem = useCallback(async (sellerOfferId, quantity) => {
        const token = localStorage.getItem("token");
        if (!token || quantity < 1) return;
        await updateCartItem(token, sellerOfferId, quantity);
        await refreshCart();
    }, [refreshCart]);

    /* ── Remove single item ── */
    const removeItem = useCallback(async (sellerOfferId) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        await removeCartItem(token, sellerOfferId);
        await refreshCart();
    }, [refreshCart]);

    /* ── Clear all items ── */
    const clearCart = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const items = cart?.items ?? [];
        await Promise.all(
            items.map(item => {
                const oid = item.sellerOfferId?._id ?? item.sellerOfferId?.toString?.() ?? item.sellerOfferId;
                return oid ? removeCartItem(token, oid) : Promise.resolve();
            })
        );
        await refreshCart();
    }, [cart, refreshCart]);

    /* ── Derived values ── */
    const items      = cart?.items         ?? [];
    const totalPrice = cart?.totalPrice    ?? items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
    const itemCount  = items.reduce((s, i) => s + i.quantity, 0);

    return (
        <CartContext.Provider value={{
            cart,
            items,
            totalPrice,
            itemCount,
            loading,
            error,
            refreshCart,
            addItem,
            updateItem,
            removeItem,
            clearCart,
        }}>
            {children}
        </CartContext.Provider>
    );
}

/* ── Hook ──────────────────────────────────────────────────────── */
export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
    return ctx;
}
