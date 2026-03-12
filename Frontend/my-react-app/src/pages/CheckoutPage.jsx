import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCart } from "../services/cartService";
import { placeOrder } from "../services/orderService";

/* ─── Breadcrumb Step Bar ─── */
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
        padding: "28px 32px",
    },
    input: {
        width: "100%",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        color: "#fff",
        padding: "11px 14px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
    },
    label: {
        display: "block",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "#94a3b8",
        marginBottom: 6,
        fontWeight: 600,
    },
    btnBlue: {
        background: "linear-gradient(to right, #006494, #0582ca)",
        color: "#fff", border: "none", borderRadius: 10,
        cursor: "pointer", fontWeight: 700, fontSize: 15,
        padding: "13px 28px", transition: "opacity 0.2s", width: "100%",
    },
};

const EMPTY_ADDR = { fullName: "", phone: "", street: "", city: "", postalCode: "" };

export default function CheckoutPage() {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_ADDR);
    const [errors, setErrors] = useState({});
    const [placing, setPlacing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [toast, setToast] = useState(null);

    const token = localStorage.getItem("token");

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        const data = await getCart(token);
        setCart(data);
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
    };

    const validate = () => {
        const e = {};
        if (!form.fullName.trim()) e.fullName = "Required";
        if (!form.phone.trim()) e.phone = "Required";
        if (!form.street.trim()) e.street = "Required";
        if (!form.city.trim()) e.city = "Required";
        if (!form.postalCode.trim()) e.postalCode = "Required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handlePlaceOrder = async () => {
        if (!validate()) return;
        setPlacing(true);
        try {
            await placeOrder(token, form);
            setSuccess(true);
            setTimeout(() => navigate("/orders"), 3500);
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setPlacing(false);
        }
    };

    const items = cart?.cart?.items || [];
    const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

    // ─── Success Screen ───
    if (success) {
        return (
            <div style={{
                ...S.page,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease forwards" }}>
                    <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
                    <div style={{ fontSize: 80, animation: "bounce 1s ease infinite", marginBottom: 24 }}>✅</div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Order Placed!</h2>
                    <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 8 }}>
                        Thank you! Your order has been successfully placed.
                    </p>
                    <p style={{ color: "#64748b", fontSize: 13 }}>
                        Redirecting to your orders…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={S.page}>
            <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        .co-wrap{animation:fadeIn 0.4s ease forwards;max-width:900px;margin:0 auto;}
        .co-input:focus{border-color:#0582ca!important;box-shadow:0 0 0 3px rgba(5,130,202,0.15)!important;}
        .co-btn:hover{opacity:0.85;}
      `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", top: 24, right: 24, zIndex: 9999,
                    background: toast.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${toast.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    borderRadius: 12, padding: "13px 20px",
                    color: toast.ok ? "#4ade80" : "#f87171",
                    fontWeight: 600, fontSize: 14, backdropFilter: "blur(12px)",
                    animation: "toastIn 0.3s ease forwards",
                }}>
                    {toast.msg}
                </div>
            )}

            <div className="co-wrap">
                {/* Progress Breadcrumb */}
                <StepBar step={1} />

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>💳 Checkout</h1>
                        <p style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>Complete your order</p>
                    </div>
                    <Link to="/cart" style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, padding: "8px 18px", textDecoration: "none",
                        fontWeight: 600, fontSize: 13,
                    }}>← Back to Cart</Link>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #4ac6ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                        <p style={{ color: "#64748b", fontSize: 14 }}>Loading…</p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

                        {/* Left: Shipping Form */}
                        <div style={S.card}>
                            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                                📦 Shipping Address
                            </h2>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={S.label}>Full Name *</label>
                                    <input
                                        className="co-input"
                                        style={{ ...S.input, borderColor: errors.fullName ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                        value={form.fullName}
                                        onChange={(e) => set("fullName", e.target.value)}
                                        placeholder="John Doe"
                                    />
                                    {errors.fullName && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.fullName}</p>}
                                </div>
                                <div>
                                    <label style={S.label}>Phone Number *</label>
                                    <input
                                        className="co-input"
                                        style={{ ...S.input, borderColor: errors.phone ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                        value={form.phone}
                                        onChange={(e) => set("phone", e.target.value)}
                                        placeholder="+94 77 000 0000"
                                    />
                                    {errors.phone && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.phone}</p>}
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={S.label}>Street Address *</label>
                                <input
                                    className="co-input"
                                    style={{ ...S.input, borderColor: errors.street ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                    value={form.street}
                                    onChange={(e) => set("street", e.target.value)}
                                    placeholder="123 Main Street, Apt 4B"
                                />
                                {errors.street && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.street}</p>}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <label style={S.label}>City *</label>
                                    <input
                                        className="co-input"
                                        style={{ ...S.input, borderColor: errors.city ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                        value={form.city}
                                        onChange={(e) => set("city", e.target.value)}
                                        placeholder="Colombo"
                                    />
                                    {errors.city && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.city}</p>}
                                </div>
                                <div>
                                    <label style={S.label}>Postal Code *</label>
                                    <input
                                        className="co-input"
                                        style={{ ...S.input, borderColor: errors.postalCode ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                        value={form.postalCode}
                                        onChange={(e) => set("postalCode", e.target.value)}
                                        placeholder="10001"
                                    />
                                    {errors.postalCode && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.postalCode}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Right: Order Summary */}
                        <div style={{ ...S.card, position: "sticky", top: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Order Summary</h3>

                            {items.length === 0 ? (
                                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Your cart is empty.</p>
                            ) : (
                                items.map((item) => {
                                    const product = item.productId || {};
                                    return (
                                        <div key={item.sellerOfferId?.toString()} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                                            <span style={{ color: "#94a3b8", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {product.productName || "Product"} ×{item.quantity}
                                            </span>
                                            <span style={{ fontWeight: 600 }}>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    );
                                })
                            )}

                            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                                <span style={{ color: "#94a3b8" }}>Shipping</span>
                                <span style={{ color: "#4ade80", fontWeight: 600 }}>Free</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                                <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
                                <span style={{ fontWeight: 800, fontSize: 18, color: "#4ade80" }}>
                                    Rs. {totalPrice.toLocaleString()}
                                </span>
                            </div>

                            <button
                                className="co-btn"
                                onClick={handlePlaceOrder}
                                disabled={placing || items.length === 0}
                                style={{
                                    ...S.btnBlue,
                                    opacity: placing || items.length === 0 ? 0.5 : 1,
                                    cursor: placing || items.length === 0 ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                }}
                            >
                                {placing ? (
                                    <>
                                        <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                                        Placing Order…
                                    </>
                                ) : "Place Order 🎉"}
                            </button>

                            <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#475569" }}>
                                🔒 Secure & encrypted payment
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
