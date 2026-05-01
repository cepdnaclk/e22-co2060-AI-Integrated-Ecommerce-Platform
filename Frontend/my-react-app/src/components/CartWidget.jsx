import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

/* Pages where the widget should NOT appear */
const HIDDEN_PATHS = ["/cart", "/checkout", "/login", "/orders", "/admin", "/dms"];

export default function CartWidget() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const token     = localStorage.getItem("token");

    const { items, itemCount, totalPrice, loading, refreshCart, removeItem } = useCart();

    const [open,      setOpen]      = useState(false);
    const [removing,  setRemoving]  = useState(null);
    const panelRef    = useRef(null);

    /* ── Hide when not logged-in or on excluded pages ── */
    const hidden = !token || HIDDEN_PATHS.some(p => location.pathname.startsWith(p));

    /* ── Refresh when route changes ── */
    useEffect(() => {
        if (!hidden) refreshCart();
    }, [location.pathname]); // eslint-disable-line

    /* ── Auto-refresh every 30 s while open ── */
    useEffect(() => {
        if (!open) return;
        const id = setInterval(refreshCart, 30000);
        return () => clearInterval(id);
    }, [open, refreshCart]);

    /* ── Click-outside to close ── */
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    /* ── Remove from mini-cart ── */
    const handleRemove = async (offerId) => {
        if (!offerId) return;
        setRemoving(offerId);
        try { await removeItem(offerId); } catch (e) { console.error(e); }
        setRemoving(null);
    };

    if (hidden) return null;

    return (
        <>
            <style>{`
                @keyframes cw-badge-pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
                @keyframes cw-panel-in  { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes cw-spin      { to{transform:rotate(360deg)} }

                .cw-fab {
                    position:fixed; bottom:100px; right:28px; z-index:1200;
                    width:58px; height:58px; border-radius:50%;
                    background:linear-gradient(135deg,#006494,#0582ca);
                    border:none; cursor:pointer;
                    display:flex; align-items:center; justify-content:center;
                    box-shadow:0 8px 28px rgba(5,130,202,0.45),0 2px 8px rgba(0,0,0,0.35);
                    transition:transform 0.2s,box-shadow 0.2s; outline:none;
                }
                .cw-fab:hover { transform:translateY(-3px) scale(1.06); box-shadow:0 16px 40px rgba(5,130,202,0.55); }
                .cw-fab:active{ transform:scale(0.95); }
                .cw-fab-open  { background:linear-gradient(135deg,#0582ca,#38bdf8); }

                .cw-badge {
                    position:absolute; top:-5px; right:-5px;
                    background:linear-gradient(135deg,#ef4444,#f97316);
                    color:#fff; font-size:10px; font-weight:800;
                    min-width:20px; height:20px; border-radius:9999px;
                    display:flex; align-items:center; justify-content:center;
                    border:2px solid #050B2E; padding:0 4px;
                    animation:cw-badge-pop 0.3s ease;
                }

                .cw-panel {
                    position:fixed; bottom:170px; right:24px; z-index:1199;
                    width:340px; max-height:520px;
                    background:linear-gradient(160deg,#0d1b38 0%,#091225 100%);
                    border:1px solid rgba(5,130,202,0.25); border-radius:20px;
                    box-shadow:0 24px 80px rgba(0,0,0,0.6);
                    overflow:hidden; display:flex; flex-direction:column;
                    animation:cw-panel-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
                    backdrop-filter:blur(20px);
                }
                .cw-panel-hdr {
                    padding:18px 20px 14px;
                    border-bottom:1px solid rgba(255,255,255,0.07);
                    display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
                }
                .cw-items {
                    overflow-y:auto; flex:1;
                    scrollbar-width:thin; scrollbar-color:rgba(5,130,202,0.3) transparent;
                }
                .cw-items::-webkit-scrollbar{ width:4px; }
                .cw-items::-webkit-scrollbar-thumb{ background:rgba(5,130,202,0.3); border-radius:4px; }
                .cw-item {
                    display:flex; align-items:center; gap:12px;
                    padding:12px 18px; border-bottom:1px solid rgba(255,255,255,0.05);
                    transition:background 0.18s;
                }
                .cw-item:hover { background:rgba(255,255,255,0.03); }
                .cw-item:last-child { border-bottom:none; }
                .cw-rm {
                    background:none; border:none; color:#64748b; cursor:pointer;
                    font-size:15px; padding:2px 5px; border-radius:6px; line-height:1;
                    transition:color 0.15s,background 0.15s; flex-shrink:0;
                }
                .cw-rm:hover{ color:#f87171; background:rgba(239,68,68,0.12); }
                .cw-footer {
                    padding:14px 20px; border-top:1px solid rgba(255,255,255,0.07);
                    flex-shrink:0; background:rgba(0,0,0,0.2);
                }
                .cw-btn-view {
                    width:100%; padding:12px;
                    background:linear-gradient(to right,#006494,#0582ca);
                    color:#fff; border:none; border-radius:12px;
                    font-size:14px; font-weight:700; cursor:pointer;
                    transition:opacity 0.2s,transform 0.15s;
                }
                .cw-btn-view:hover{ opacity:0.9; transform:translateY(-1px); }
                .cw-btn-checkout {
                    width:100%; padding:11px;
                    background:linear-gradient(to right,#16a34a,#22c55e);
                    color:#fff; border:none; border-radius:12px;
                    font-size:13px; font-weight:700; cursor:pointer; margin-top:8px;
                    transition:opacity 0.2s,transform 0.15s;
                }
                .cw-btn-checkout:hover{ opacity:0.9; transform:translateY(-1px); }
                .cw-empty { padding:40px 20px; text-align:center; color:#475569; font-size:13px; }
                .cw-img   { width:46px; height:46px; border-radius:8px; object-fit:cover; background:#1e293b; flex-shrink:0; }

                @media (max-width:400px) {
                    .cw-panel{ width:calc(100vw - 32px); right:16px; }
                    .cw-fab  { right:16px; }
                }
            `}</style>

            {/* ── Mini-cart panel ── */}
            {open && (
                <div className="cw-panel" ref={panelRef}>
                    {/* Header */}
                    <div className="cw-panel-hdr">
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:20 }}>🛒</span>
                            <div>
                                <div style={{ fontWeight:700, fontSize:15, color:"#e2e8f0" }}>My Cart</div>
                                <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>
                                    {loading ? "Refreshing…" : `${itemCount} item${itemCount !== 1 ? "s" : ""}`}
                                </div>
                            </div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <button
                                onClick={refreshCart}
                                disabled={loading}
                                style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"4px 6px", borderRadius:6 }}
                                title="Refresh"
                            >
                                <span style={{ display:"inline-block", animation:loading ? "cw-spin 0.9s linear infinite" : "none" }}>↻</span>
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18, padding:"2px 6px", lineHeight:1, borderRadius:6 }}
                            >✕</button>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="cw-items">
                        {loading && items.length === 0 ? (
                            <div className="cw-empty">
                                <div style={{ width:28, height:28, border:"3px solid rgba(255,255,255,0.08)", borderTop:"3px solid #4ac6ff", borderRadius:"50%", animation:"cw-spin 1s linear infinite", margin:"0 auto 10px" }} />
                                Loading…
                            </div>
                        ) : items.length === 0 ? (
                            <div className="cw-empty">
                                <div style={{ fontSize:40, marginBottom:10 }}>🛍️</div>
                                <div style={{ fontWeight:600, color:"#64748b", marginBottom:4 }}>Your cart is empty</div>
                                <div style={{ fontSize:12, color:"#334155" }}>Add products to get started</div>
                            </div>
                        ) : (
                            items.map((item, idx) => {
                                /* --- normalise item shape --- */
                                const offer   = item.sellerOfferId || {};
                                // CartPage stores items with productId/sellerId at top level
                                const product = offer.productId || item.productId || {};
                                const name    = product.productName || offer.productName || item.productName || "Product";
                                const img     = offer.image || product.image || item.image || "";
                                const price   = offer.price ?? item.price ?? 0;
                                const oid     = offer._id || (typeof item.sellerOfferId === "string" ? item.sellerOfferId : null);

                                return (
                                    <div key={oid || idx} className="cw-item" style={{ opacity: removing === oid ? 0.35 : 1, transition:"opacity 0.2s" }}>
                                        <img
                                            className="cw-img"
                                            src={img}
                                            alt={name}
                                            onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='46' height='46' fill='%231e293b'%3E%3Crect width='46' height='46' rx='8'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='20'%3E📦%3C/text%3E%3C/svg%3E"; }}
                                        />
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                                {name}
                                            </div>
                                            <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                                                Qty {item.quantity} ·{" "}
                                                <span style={{ color:"#4ac6ff", fontWeight:700 }}>
                                                    Rs. {(price * item.quantity).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className="cw-rm"
                                            onClick={() => handleRemove(oid)}
                                            disabled={removing === oid}
                                            title="Remove"
                                        >✕</button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                        <div className="cw-footer">
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                                <span style={{ fontSize:13, color:"#64748b", fontWeight:600 }}>
                                    Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
                                </span>
                                <span style={{ fontSize:16, fontWeight:800, color:"#4ade80" }}>
                                    Rs. {totalPrice.toLocaleString()}
                                </span>
                            </div>
                            <button className="cw-btn-view"     onClick={() => { setOpen(false); navigate("/cart"); }}>
                                🛒 View Full Cart
                            </button>
                            <button className="cw-btn-checkout" onClick={() => { setOpen(false); navigate("/checkout"); }}>
                                ⚡ Checkout Now
                            </button>
                        </div>
                    )}

                    {items.length === 0 && !loading && (
                        <div style={{ padding:"0 18px 18px" }}>
                            <button
                                className="cw-btn-view"
                                onClick={() => { setOpen(false); navigate("/products"); }}
                                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)" }}
                            >Browse Products</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── FAB ── */}
            <div style={{ position:"fixed", bottom:100, right:28, zIndex:1201 }}>
                <button
                    className={`cw-fab ${open ? "cw-fab-open" : ""}`}
                    onClick={() => { setOpen(o => !o); if (!open) refreshCart(); }}
                    aria-label="Open cart"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9"  cy="21" r="1" fill="#fff" stroke="none" />
                        <circle cx="20" cy="21" r="1" fill="#fff" stroke="none" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61H19a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>

                    {itemCount > 0 && (
                        <span className="cw-badge" key={itemCount}>
                            {itemCount > 99 ? "99+" : itemCount}
                        </span>
                    )}
                </button>
            </div>
        </>
    );
}
