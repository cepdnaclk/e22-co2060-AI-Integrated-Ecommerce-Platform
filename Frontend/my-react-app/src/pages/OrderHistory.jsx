import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyOrders } from "../services/orderService";

/* ─── Status tokens ─── */
const STATUS_COLORS = {
    pending:   { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "rgba(251,191,36,0.3)" },
    confirmed: { bg: "rgba(34,197,94,0.12)",   color: "#4ade80", border: "rgba(34,197,94,0.3)" },
    shipped:   { bg: "rgba(59,130,246,0.12)",  color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
    delivered: { bg: "rgba(16,185,129,0.12)",  color: "#34d399", border: "rgba(16,185,129,0.3)" },
    cancelled: { bg: "rgba(239,68,68,0.12)",   color: "#f87171", border: "rgba(239,68,68,0.3)" },
};
const STATUS_ICONS  = { pending:"⏳", confirmed:"✅", shipped:"📦", delivered:"🎉", cancelled:"❌" };

/* ─── Filter pills ─── */
const FILTERS = [
    { key:"all",       label:"All" },
    { key:"pending",   label:"Pending" },
    { key:"confirmed", label:"Confirmed" },
    { key:"shipped",   label:"Shipped" },
    { key:"delivered", label:"Delivered" },
    { key:"cancelled", label:"Cancelled" },
];

export default function OrderHistory() {
    const navigate = useNavigate();
    const [orders,  setOrders]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState("");
    const [filter,  setFilter]  = useState("all");

    const token = localStorage.getItem("token");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        const data = await getMyOrders(token);
        if (!Array.isArray(data)) setError("Failed to load orders.");
        else setOrders(data);
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
    const totalSpent   = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.totalAmount || 0), 0);
    const activeOrders = orders.filter(o => ["pending","confirmed","shipped"].includes(o.status)).length;

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
            color: "#fff",
            fontFamily: "'Segoe UI', Arial, sans-serif",
            padding: "40px 24px",
        }}>
            <style>{`
                @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin   { to { transform: rotate(360deg); } }
                .oh-wrap { animation: fadeIn 0.4s ease forwards; max-width: 860px; margin: 0 auto; }
                .oh-card { transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; }
                .oh-card:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(5,130,202,0.12); border-color: rgba(5,130,202,0.22) !important; }
                .filter-pill { padding:6px 16px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#94a3b8; cursor:pointer; font-size:12px; font-weight:600; transition:all 0.2s; }
                .filter-pill:hover { background:rgba(5,130,202,0.15); border-color:rgba(5,130,202,0.3); color:#4ac6ff; }
                .filter-pill.active { background:linear-gradient(to right,#006494,#0582ca); border-color:#0582ca; color:#fff; }
            `}</style>

            <div className="oh-wrap">
                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32, flexWrap:"wrap", gap:12 }}>
                    <div>
                        <h1 style={{ fontSize:26, fontWeight:700, margin:0 }}>📋 My Orders</h1>
                        <p style={{ color:"#64748b", marginTop:6, fontSize:14 }}>Track and review your purchase history</p>
                    </div>
                    <div style={{ display:"flex", gap:10 }}>
                        <button onClick={() => navigate("/profile")} style={{ background:"rgba(255,255,255,0.05)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 18px", cursor:"pointer", fontWeight:600, fontSize:13 }}>
                            👤 Profile
                        </button>
                        <Link to="/products" style={{ background:"rgba(255,255,255,0.05)", color:"#94a3b8", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 18px", textDecoration:"none", fontWeight:600, fontSize:13 }}>
                            ← Browse More
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                {!loading && orders.length > 0 && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
                        {[
                            { label:"Total Orders",  value: orders.length,                                                    icon:"📦", color:"#4ac6ff" },
                            { label:"Total Spent",   value: `Rs. ${totalSpent.toLocaleString()}`,                             icon:"💰", color:"#4ade80" },
                            { label:"Active Orders", value: activeOrders,                                                     icon:"🚚", color:"#f59e0b" },
                            { label:"Delivered",     value: orders.filter(o=>o.status==="delivered").length,                  icon:"🎉", color:"#34d399" },
                        ].map(stat => (
                            <div key={stat.label} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"16px 18px", backdropFilter:"blur(10px)" }}>
                                <div style={{ fontSize:20, marginBottom:6 }}>{stat.icon}</div>
                                <div style={{ fontSize: stat.label==="Total Spent"?15:22, fontWeight:800, color:stat.color }}>{stat.value}</div>
                                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter pills */}
                {!loading && orders.length > 0 && (
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:22 }}>
                        {FILTERS.map(f => (
                            <button key={f.key} className={`filter-pill ${filter===f.key?"active":""}`} onClick={() => setFilter(f.key)}>
                                {f.label}
                                {f.key !== "all" && orders.filter(o=>o.status===f.key).length > 0 && (
                                    <span style={{ marginLeft:4, opacity:0.7 }}>({orders.filter(o=>o.status===f.key).length})</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign:"center", padding:"80px 0" }}>
                        <div style={{ width:40, height:40, border:"3px solid rgba(255,255,255,0.1)", borderTop:"3px solid #4ac6ff", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
                        <p style={{ color:"#64748b" }}>Loading your orders…</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div style={{ textAlign:"center", padding:"60px 0" }}>
                        <p style={{ color:"#f87171", marginBottom:16 }}>{error}</p>
                        <button onClick={load} style={{ background:"linear-gradient(to right,#006494,#0582ca)", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", cursor:"pointer", fontWeight:600 }}>
                            Retry
                        </button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && orders.length === 0 && (
                    <div style={{ textAlign:"center", padding:"80px 24px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16 }}>
                        <div style={{ fontSize:64, marginBottom:16 }}>📋</div>
                        <h3 style={{ fontSize:20, fontWeight:600, marginBottom:8 }}>No orders yet</h3>
                        <p style={{ color:"#64748b", marginBottom:28, fontSize:14 }}>Start shopping and your orders will appear here.</p>
                        <Link to="/products" style={{ background:"linear-gradient(to right,#006494,#0582ca)", color:"#fff", textDecoration:"none", borderRadius:10, padding:"11px 26px", fontWeight:700, fontSize:14, display:"inline-block" }}>
                            Discover Products
                        </Link>
                    </div>
                )}

                {/* No filtered results */}
                {!loading && !error && orders.length > 0 && filtered.length === 0 && (
                    <div style={{ textAlign:"center", padding:"60px 24px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16 }}>
                        <p style={{ color:"#64748b", fontSize:14 }}>No {filter} orders found.</p>
                    </div>
                )}

                {/* Orders List */}
                {!loading && !error && filtered.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                        {filtered.map(order => {
                            const sc = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
                            const placedDate = new Date(order.createdAt).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" });
                            const itemCount  = (order.items||[]).reduce((s,i)=>s+i.quantity, 0);

                            return (
                                <div key={order._id} className="oh-card" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"22px 26px", backdropFilter:"blur(10px)" }}>
                                    {/* Top Row */}
                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
                                        <div>
                                            <p style={{ fontWeight:700, fontSize:14, color:"#e2e8f0", margin:0 }}>
                                                Order #{order._id.slice(-8).toUpperCase()}
                                            </p>
                                            <p style={{ fontSize:12, color:"#64748b", marginTop:4 }}>
                                                📅 {placedDate} · {itemCount} item{itemCount!==1?"s":""}
                                                {order.sellerId?.shopName && <span style={{ marginLeft:10 }}>🏪 {order.sellerId.shopName}</span>}
                                            </p>
                                        </div>
                                        <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", padding:"5px 14px", borderRadius:20, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, display:"inline-flex", alignItems:"center", gap:5 }}>
                                            {STATUS_ICONS[order.status]} {order.status}
                                        </span>
                                    </div>

                                    {/* Items */}
                                    <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
                                        {(order.items||[]).map((item, idx) => (
                                            <div key={idx} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom: idx < order.items.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                                <span style={{ color:"#94a3b8" }}>{item.productName || "Product"} × {item.quantity}</span>
                                                <span style={{ fontWeight:600 }}>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Shipping Address */}
                                    {order.shippingAddress && (
                                        <p style={{ fontSize:12, color:"#64748b", marginBottom:14 }}>
                                            📍 {order.shippingAddress.fullName} · {order.shippingAddress.street}, {order.shippingAddress.city} {order.shippingAddress.postalCode} · {order.shippingAddress.phone}
                                        </p>
                                    )}

                                    {/* Total row */}
                                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                        {/* Status progression hint */}
                                        <div style={{ fontSize:12, color:"#475569" }}>
                                            {order.status === "pending"   && "⏳ Awaiting seller confirmation"}
                                            {order.status === "confirmed" && "✅ Seller confirmed — preparing shipment"}
                                            {order.status === "shipped"   && "📦 On the way to you"}
                                            {order.status === "delivered" && "🎉 Delivered successfully"}
                                            {order.status === "cancelled" && "❌ This order was cancelled"}
                                        </div>
                                        <div style={{ textAlign:"right" }}>
                                            <div style={{ fontSize:11, color:"#64748b" }}>Order Total</div>
                                            <div style={{ fontSize:20, fontWeight:800, color:"#4ade80" }}>Rs. {order.totalAmount?.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
