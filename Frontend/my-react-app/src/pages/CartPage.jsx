import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCart, updateCartItem, removeCartItem } from "../services/cartService";

/* ─── Style tokens ─── */
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    padding: "40px 24px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    backdropFilter: "blur(10px)",
  },
  btnBlue: {
    background: "linear-gradient(to right, #006494, #0582ca)",
    color: "#fff", border: "none", borderRadius: 10,
    cursor: "pointer", fontWeight: 700, fontSize: 15,
    padding: "12px 28px", transition: "opacity 0.2s",
  },
  btnGray: {
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, cursor: "pointer", fontWeight: 600,
    fontSize: 13, padding: "8px 18px", textDecoration: "none",
    display: "inline-block",
  },
  btnRed: {
    background: "transparent",
    color: "#f87171",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 8, cursor: "pointer",
    fontWeight: 600, fontSize: 12,
    padding: "5px 12px", transition: "background 0.2s",
  },
};

/* ─── Breadcrumb Steps ─── */
function StepBar({ step }) {
  const steps = ["Cart", "Checkout", "Order Placed"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36, justifyContent: "center" }}>
      {steps.map((s, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#4ade80" : active ? "linear-gradient(to right,#006494,#0582ca)" : "rgba(255,255,255,0.07)",
                border: done ? "2px solid #4ade80" : active ? "2px solid #0582ca" : "2px solid rgba(255,255,255,0.12)",
                fontSize: 14, fontWeight: 700,
                color: done || active ? "#fff" : "#64748b",
                transition: "all 0.3s",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#4ac6ff" : done ? "#4ade80" : "#64748b", letterSpacing: "0.03em" }}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#4ade80" : "rgba(255,255,255,0.08)", margin: "0 8px", marginBottom: 20, minWidth: 60, maxWidth: 120, transition: "background 0.3s" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState(null);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState(null);

  const token = localStorage.getItem("token");

  const showToast = (msg, success = true) => {
    setToast({ msg, success });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getCart(token);
    setCart(data);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleQuantity = async (sellerOfferId, newQty, maxStock) => {
    if (newQty < 1) return;
    if (maxStock && newQty > maxStock) return;
    setUpdating(sellerOfferId);
    try {
      await updateCartItem(token, sellerOfferId, newQty);
      await load();
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (sellerOfferId) => {
    setUpdating(sellerOfferId);
    try {
      await removeCartItem(token, sellerOfferId);
      showToast("Item removed from cart");
      await load();
    } catch (err) {
      showToast(err.message, false);
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = async () => {
    if (!items.length) return;
    setClearing(true);
    try {
      await Promise.all(items.map((item) => removeCartItem(token, item.sellerOfferId?.toString())));
      showToast("Cart cleared");
      await load();
    } catch (err) {
      showToast("Failed to clear cart", false);
    } finally {
      setClearing(false);
    }
  };

  const handleApplyCoupon = () => {
    if (!coupon.trim()) return;
    setCouponMsg({ text: `Coupon "${coupon.trim().toUpperCase()}" is invalid or expired.`, ok: false });
  };

  const items = cart?.cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = 0;
  const totalPrice = subtotal + shipping;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        .cart-wrap { animation: fadeIn 0.4s ease forwards; max-width: 920px; margin: 0 auto; }
        .cart-item { transition: box-shadow 0.2s, border-color 0.2s; }
        .cart-item:hover { box-shadow: 0 8px 32px rgba(5,130,202,0.1); border-color: rgba(5,130,202,0.2) !important; }
        .qty-btn { width:32px; height:32px; border-radius:8px; border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.06); color:#fff; cursor:pointer; font-size:17px; font-weight:700;
          display:flex; align-items:center; justify-content:center; transition:background 0.18s; }
        .qty-btn:hover:not(:disabled) { background:rgba(5,130,202,0.25); border-color:#0582ca; }
        .qty-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .remove-btn:hover { background:rgba(239,68,68,0.12) !important; }
        .checkout-btn:hover { opacity:0.85; }
        .clear-btn:hover { background:rgba(239,68,68,0.1) !important; border-color:rgba(239,68,68,0.35) !important; }
        .coupon-apply:hover { background:rgba(5,130,202,0.2) !important; }
        .continue-shopping:hover { background:rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 12, padding: "13px 20px",
          color: toast.success ? "#4ade80" : "#f87171",
          fontWeight: 600, fontSize: 14, backdropFilter: "blur(12px)",
          animation: "toastIn 0.3s ease forwards",
        }}>
          {toast.msg}
        </div>
      )}

      <div className="cart-wrap">
        {/* Progress Breadcrumb */}
        <StepBar step={0} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>🛒 My Cart</h1>
            <p style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>
              {loading ? "Loading…" : items.length > 0 ? `${totalItems} item${totalItems !== 1 ? "s" : ""} in your cart` : "Your cart is empty"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {items.length > 0 && (
              <button
                className="clear-btn"
                onClick={handleClearCart}
                disabled={clearing}
                style={{ ...S.btnRed, padding: "8px 16px", fontSize: 13 }}
              >
                {clearing ? "Clearing…" : "🗑️ Clear Cart"}
              </button>
            )}
            <Link to="/products" className="continue-shopping" style={{ ...S.btnGray, transition: "background 0.2s" }}>← Continue Shopping</Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #4ac6ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ color: "#64748b" }}>Loading your cart…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 24px", ...S.card }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🛒</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Your cart is empty</h3>
            <p style={{ color: "#64748b", marginBottom: 32, fontSize: 14, maxWidth: 340, margin: "0 auto 32px" }}>
              Looks like you haven't added anything yet. Explore our products and find something you love!
            </p>
            <Link to="/products" style={{ ...S.btnBlue, textDecoration: "none", display: "inline-block" }}>
              🔍 Discover Products
            </Link>
          </div>
        )}

        {/* Cart Items + Summary */}
        {!loading && items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

            {/* Left: Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {items.map((item) => {
                const product = item.productId || {};
                const seller = item.sellerId || {};
                const offerId = item.sellerOfferId?.toString();
                const isUpdating = updating === offerId;
                const lineTotal = item.price * item.quantity;

                return (
                  <div
                    key={offerId}
                    className="cart-item"
                    style={{
                      ...S.card, padding: "18px 20px",
                      opacity: isUpdating ? 0.6 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      {/* Image */}
                      <img
                        src={product.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%231e293b'%3E%3Crect width='80' height='80' rx='10'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='28'%3E📦%3C/text%3E%3C/svg%3E"}
                        alt={product.productName}
                        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12, flexShrink: 0, background: "#1e293b" }}
                        onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%231e293b'%3E%3Crect width='80' height='80' rx='10'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='28'%3E📦%3C/text%3E%3C/svg%3E"; }}
                      />

                      {/* Info + Controls */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Product name + remove */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <p style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", margin: 0 }}>
                            {product.productName || "Product"}
                          </p>
                          <button
                            className="remove-btn"
                            onClick={() => handleRemove(offerId)}
                            disabled={isUpdating}
                            style={{ ...S.btnRed, flexShrink: 0 }}
                          >
                            🗑️ Remove
                          </button>
                        </div>

                        {seller.shopName && (
                          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                            🏪 {seller.shopName}
                          </p>
                        )}

                        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                          Unit price: <span style={{ color: "#94a3b8", fontWeight: 600 }}>Rs. {item.price.toLocaleString()}</span>
                        </p>

                        {/* Qty controls + line total */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              className="qty-btn"
                              onClick={() => handleQuantity(offerId, item.quantity - 1)}
                              disabled={isUpdating || item.quantity <= 1}
                            >−</button>
                            <span style={{ fontSize: 16, fontWeight: 700, minWidth: 28, textAlign: "center" }}>
                              {item.quantity}
                            </span>
                            <button
                              className="qty-btn"
                              onClick={() => handleQuantity(offerId, item.quantity + 1)}
                              disabled={isUpdating}
                            >+</button>
                          </div>

                          <p style={{ fontSize: 16, fontWeight: 800, color: "#4ade80", margin: 0 }}>
                            Rs. {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Order Summary */}
            <div style={{ ...S.card, padding: "24px", position: "sticky", top: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#e2e8f0" }}>Order Summary</h3>

              {items.map((item) => {
                const product = item.productId || {};
                return (
                  <div key={item.sellerOfferId?.toString()} style={{ display: "flex", justifyContent: "space-between", marginBottom: 9, fontSize: 13 }}>
                    <span style={{ color: "#94a3b8", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {product.productName || "Product"} ×{item.quantity}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                );
              })}

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: "#94a3b8" }}>Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                <span style={{ fontWeight: 600 }}>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 13 }}>
                <span style={{ color: "#94a3b8" }}>Shipping</span>
                <span style={{ color: "#4ade80", fontWeight: 600 }}>Free</span>
              </div>

              {/* Coupon Code */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", fontWeight: 600, marginBottom: 7 }}>Coupon Code</p>
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    value={coupon}
                    onChange={(e) => { setCoupon(e.target.value); setCouponMsg(null); }}
                    placeholder="Enter code"
                    style={{
                      flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, color: "#fff", padding: "8px 10px", fontSize: 13, outline: "none",
                    }}
                  />
                  <button
                    className="coupon-apply"
                    onClick={handleApplyCoupon}
                    style={{ background: "rgba(5,130,202,0.1)", border: "1px solid rgba(5,130,202,0.2)", borderRadius: 8, color: "#4ac6ff", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "0 12px", whiteSpace: "nowrap", transition: "background 0.2s" }}
                  >
                    Apply
                  </button>
                </div>
                {couponMsg && (
                  <p style={{ fontSize: 11, marginTop: 5, color: couponMsg.ok ? "#4ade80" : "#f87171" }}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 14 }} />

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: "#4ade80" }}>
                  Rs. {totalPrice.toLocaleString()}
                </span>
              </div>

              <button
                className="checkout-btn"
                onClick={() => navigate("/checkout")}
                style={{ ...S.btnBlue, width: "100%", textAlign: "center" }}
              >
                Proceed to Checkout →
              </button>

              <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#475569" }}>
                🔒 Secure checkout
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
