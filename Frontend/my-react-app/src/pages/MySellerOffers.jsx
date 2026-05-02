import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getMySellerOffers, updateSellerOffer, disableSellerOffer, enableSellerOffer } from "../services/sellerOfferService";

/* ─── Shared style tokens matching SellerDashboard theme ─── */
const S = {
    pg: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
    },
    card: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        backdropFilter: "blur(10px)",
        transition: "transform 0.2s, box-shadow 0.2s",
    },
    btnBlue: {
        background: "linear-gradient(to right, #006494, #0582ca)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        padding: "9px 20px",
        transition: "opacity 0.2s",
    },
    btnGray: {
        background: "rgba(255,255,255,0.05)",
        color: "#94a3b8",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        padding: "9px 20px",
        textDecoration: "none",
        display: "inline-block",
    },
    btnRed: {
        background: "rgba(239,68,68,0.1)",
        color: "#f87171",
        border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 13,
        padding: "7px 16px",
        transition: "background 0.2s",
    },
    input: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8,
        color: "#fff",
        padding: "9px 12px",
        fontSize: 14,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
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
    overlay: {
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(2,6,23,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
    },
};

export default function MySellerOffers() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filterStatus, setFilterStatus] = useState("all"); // all | active | paused
    const [toast, setToast] = useState(null);

    // Edit modal
    const [editOffer, setEditOffer] = useState(null);
    const [editForm, setEditForm] = useState({ price: "", stock: "", warranty: "" });
    const [saving, setSaving] = useState(false);

    // Disable confirm
    const [disableTarget, setDisableTarget] = useState(null);
    const [disabling, setDisabling] = useState(false);

    // Resume confirm
    const [resumeTarget, setResumeTarget] = useState(null);
    const [resuming, setResuming] = useState(false);

    const token = localStorage.getItem("token");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        const data = await getMySellerOffers(token);
        if (!Array.isArray(data)) {
            setError("Failed to load offers. Please try again.");
        } else {
            setOffers(data);
        }
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const filtered = offers.filter((o) => {
        if (filterStatus === "active") return o.isActive;
        if (filterStatus === "paused") return !o.isActive;
        return true;
    });

    const showToast = (msg, success = true) => {
        setToast({ msg, success });
        setTimeout(() => setToast(null), 3500);
    };

    /* ─── EDIT ─── */
    const openEdit = (offer) => {
        setEditOffer(offer);
        setEditForm({
            price: String(offer.price),
            stock: String(offer.stock),
            warranty: offer.warranty || "",
        });
    };

    const handleEditSave = async () => {
        if (!editOffer) return;
        setSaving(true);
        try {
            const updated = await updateSellerOffer(token, editOffer._id, {
                price: Number(editForm.price),
                stock: Number(editForm.stock),
                warranty: editForm.warranty,
            });
            setOffers((prev) =>
                prev.map((o) => (o._id === editOffer._id ? updated.offer : o))
            );
            setEditOffer(null);
            showToast("Offer updated successfully ✓");
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setSaving(false);
        }
    };

    /* ─── DISABLE / PAUSE ─── */
    const handleDisable = async () => {
        if (!disableTarget) return;
        setDisabling(true);
        try {
            await disableSellerOffer(token, disableTarget._id);
            setOffers((prev) =>
                prev.map((o) => (o._id === disableTarget._id ? { ...o, isActive: false } : o))
            );
            setDisableTarget(null);
            showToast("Offer paused — buyers can no longer see it.");
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setDisabling(false);
        }
    };

    /* ─── RESUME / RE-ENABLE ─── */
    const handleResume = async () => {
        if (!resumeTarget) return;
        setResuming(true);
        try {
            await enableSellerOffer(token, resumeTarget._id);
            setOffers((prev) =>
                prev.map((o) => (o._id === resumeTarget._id ? { ...o, isActive: true } : o))
            );
            setResumeTarget(null);
            showToast("Offer resumed — it is now visible to buyers! ✓");
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setResuming(false);
        }
    };

    /* ─── RENDER ─── */
    return (
        <div className="p-4 md:p-12" style={S.pg}>
            <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        .mso-wrap { animation: fadeIn 0.5s ease forwards; width: 100%; max-width: 900px; }
        .mso-offer-card:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 40px rgba(5,130,202,0.12) !important; border-color: rgba(5,130,202,0.2) !important; }
        .mso-filter-btn { transition: all 0.18s; }
        .mso-filter-btn.active { background: rgba(5,130,202,0.18) !important; border-color: #0582ca !important; color: #4ac6ff !important; }
        .mso-edit-btn:hover { background: rgba(5,130,202,0.18) !important; border-color: #0582ca !important; color: #4ac6ff !important; }
        .mso-disable-btn:hover { background: rgba(239,68,68,0.18) !important; }
        .mso-resume-btn:hover { background: rgba(34,197,94,0.2) !important; border-color: rgba(34,197,94,0.5) !important; color: #4ade80 !important; }
        .mso-input-focus:focus { border-color: #0582ca !important; }
        .mso-modal { animation: modalIn 0.2s ease forwards; }
      `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", top: 28, right: 28, zIndex: 9999,
                    background: toast.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${toast.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    borderRadius: 12, padding: "14px 22px",
                    color: toast.success ? "#4ade80" : "#f87171",
                    fontWeight: 600, fontSize: 14, backdropFilter: "blur(12px)",
                    animation: "toastIn 0.3s ease forwards", maxWidth: 360,
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Edit Modal */}
            {editOffer && (
                <div style={S.overlay} onClick={() => setEditOffer(null)}>
                    <div
                        className="mso-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(135deg, #0d1b38, #091429)",
                            border: "1px solid rgba(5,130,202,0.25)",
                            borderRadius: 18, padding: "32px 36px", width: "100%", maxWidth: 440,
                        }}
                    >
                        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Edit Offer</h3>
                        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 24 }}>
                            {editOffer.productId?.productName}
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={S.label}>Price (Rs.)</label>
                                <input
                                    className="mso-input-focus"
                                    type="number"
                                    min="0"
                                    style={S.input}
                                    value={editForm.price}
                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={S.label}>Stock</label>
                                <input
                                    className="mso-input-focus"
                                    type="number"
                                    min="0"
                                    style={S.input}
                                    value={editForm.stock}
                                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ marginBottom: 28 }}>
                            <label style={S.label}>Warranty</label>
                            <input
                                className="mso-input-focus"
                                style={S.input}
                                value={editForm.warranty}
                                onChange={(e) => setEditForm({ ...editForm, warranty: e.target.value })}
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                            <button style={S.btnGray} onClick={() => setEditOffer(null)}>Cancel</button>
                            <button
                                style={{ ...S.btnBlue, minWidth: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                onClick={handleEditSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Saving…</>
                                ) : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pause / Disable confirm modal */}
            {disableTarget && (
                <div style={S.overlay} onClick={() => setDisableTarget(null)}>
                    <div
                        className="mso-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(135deg, #1a0d0d, #1a0a0a)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: 18, padding: "32px 36px", width: "100%", maxWidth: 420, textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: 40, marginBottom: 16 }}>⏸️</div>
                        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Pause this offer?</h3>
                        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 28 }}>
                            <strong style={{ color: "#e2e8f0" }}>{disableTarget.productId?.productName}</strong>
                            <br />Buyers won't see this offer while it's paused.
                            <br /><span style={{ color: "#4ac6ff" }}>You can reactivate it anytime.</span>
                        </p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button style={S.btnGray} onClick={() => setDisableTarget(null)}>Cancel</button>
                            <button
                                style={{ ...S.btnRed, fontSize: 14, padding: "10px 24px", minWidth: 110, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                onClick={handleDisable}
                                disabled={disabling}
                            >
                                {disabling ? (
                                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(248,113,113,0.3)", borderTop: "2px solid #f87171", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Pausing…</>
                                ) : "⏸️ Pause Offer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resume confirm modal */}
            {resumeTarget && (
                <div style={S.overlay} onClick={() => setResumeTarget(null)}>
                    <div
                        className="mso-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(135deg, #0a1a0d, #091408)",
                            border: "1px solid rgba(34,197,94,0.25)",
                            borderRadius: 18, padding: "32px 36px", width: "100%", maxWidth: 420, textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: 40, marginBottom: 16 }}>▶️</div>
                        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Resume this offer?</h3>
                        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 28 }}>
                            <strong style={{ color: "#e2e8f0" }}>{resumeTarget.productId?.productName}</strong>
                            <br />This offer will become <span style={{ color: "#4ade80", fontWeight: 700 }}>visible to buyers</span> immediately.
                        </p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button style={S.btnGray} onClick={() => setResumeTarget(null)}>Cancel</button>
                            <button
                                style={{
                                    background: "linear-gradient(to right,#16a34a,#22c55e)",
                                    color: "#fff", border: "none", borderRadius: 10, cursor: "pointer",
                                    fontWeight: 600, fontSize: 14, padding: "10px 24px", minWidth: 110,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                    opacity: resuming ? 0.7 : 1,
                                }}
                                onClick={handleResume}
                                disabled={resuming}
                            >
                                {resuming ? (
                                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Resuming…</>
                                ) : "▶️ Resume Offer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="mso-wrap">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>My Offers</h1>
                        <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 14 }}>
                            Manage your active listings and control pricing
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link to="/seller/dashboard" style={S.btnGray}>← Dashboard</Link>
                        <Link to="/seller/offers/new" style={{ ...S.btnBlue, textDecoration: "none" }}>+ New Offer</Link>
                    </div>
                </div>

                {/* Filters + Summary */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
                    {["all", "active", "paused"].map((s) => (
                        <button
                            key={s}
                            className={`mso-filter-btn ${filterStatus === s ? "active" : ""}`}
                            onClick={() => setFilterStatus(s)}
                            style={{
                                padding: "7px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8",
                            }}
                        >
                            {s === "all" ? `All (${offers.length})` : s === "active" ? `Active (${offers.filter(o => o.isActive).length})` : `Paused (${offers.filter(o => !o.isActive).length})`}
                        </button>
                    ))}
                    <button
                        onClick={load}
                        style={{ marginLeft: "auto", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    >⟳ Refresh</button>
                </div>

                {/* States */}
                {loading && (
                    <div style={{ textAlign: "center", padding: "80px 0" }}>
                        <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #4ac6ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                        <p style={{ color: "#64748b", fontSize: 14 }}>Loading your offers…</p>
                    </div>
                )}

                {!loading && error && (
                    <div style={{ textAlign: "center", padding: "80px 0" }}>
                        <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
                        <button style={S.btnBlue} onClick={load}>Retry</button>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div style={{
                        textAlign: "center", padding: "80px 24px",
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 16,
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
                        <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
                            {filterStatus === "all" ? "No offers yet" : `No ${filterStatus} offers`}
                        </h3>
                        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
                            {filterStatus === "all"
                                ? "Create your first offer to start selling on the platform."
                                : `Switch to "All" to see all your offers.`}
                        </p>
                        {filterStatus === "all" && (
                            <Link to="/seller/offers/new" style={{ ...S.btnBlue, textDecoration: "none" }}>+ Create First Offer</Link>
                        )}
                    </div>
                )}

                {/* Offer Cards */}
                {!loading && !error && filtered.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {filtered.map((offer) => {
                            const product = offer.productId || {};
                            const discountedPrice = offer.discountPercentage > 0
                                ? offer.price * (1 - offer.discountPercentage / 100)
                                : null;

                            return (
                                <div
                                    key={offer._id}
                                    className="mso-offer-card flex flex-col sm:flex-row gap-5 items-start"
                                    style={{
                                        ...S.card,
                                        padding: "20px 24px",
                                        opacity: offer.isActive ? 1 : 0.55,
                                    }}
                                >
                                    {/* Offer / Product Image */}
                                    <div style={{ position: "relative", flexShrink: 0 }}>
                                        <img
                                            src={offer.image || product.image}
                                            alt={product.productName}
                                            style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, background: "#1e293b", display: "block" }}
                                            onError={(e) => {
                                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%231e293b'%3E%3Crect width='80' height='80' rx='10'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='28'%3E📦%3C/text%3E%3C/svg%3E";
                                            }}
                                        />
                                        {offer.image && (
                                            <span title="Custom offer image" style={{
                                                position: "absolute", bottom: -4, right: -4,
                                                background: "rgba(5,130,202,0.9)", borderRadius: 20,
                                                fontSize: 10, fontWeight: 700, padding: "2px 6px", color: "#fff",
                                                border: "1px solid rgba(74,198,255,0.4)",
                                            }}>🖼️</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>
                                                {product.productName || "Unknown Product"}
                                            </span>
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                                                padding: "2px 10px", borderRadius: 20,
                                                background: offer.isActive ? "rgba(34,197,94,0.1)" : "rgba(251,191,36,0.1)",
                                                color: offer.isActive ? "#4ade80" : "#fbbf24",
                                                border: `1px solid ${offer.isActive ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)"}`,
                                            }}>
                                                {offer.isActive ? "Active" : "Paused"}
                                            </span>
                                        </div>

                                        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 8 }}>
                                            <span style={{ fontSize: 12, color: "#64748b" }}>📂 {product.category || "—"}</span>
                                            {offer.warranty && offer.warranty !== "No warranty" && (
                                                <span style={{ fontSize: 12, color: "#64748b" }}>🛡️ {offer.warranty}</span>
                                            )}
                                            {offer.deliveryOptions?.length > 0 && (
                                                <span style={{ fontSize: 12, color: "#64748b" }}>🚚 {offer.deliveryOptions.join(", ")}</span>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                                            <div>
                                                {discountedPrice ? (
                                                    <span>
                                                        <span style={{ fontSize: 17, fontWeight: 700, color: "#4ade80" }}>
                                                            Rs. {discountedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                        <span style={{ fontSize: 12, color: "#64748b", textDecoration: "line-through", marginLeft: 8 }}>
                                                            Rs. {offer.price.toLocaleString()}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 6, fontWeight: 600 }}>
                                                            -{offer.discountPercentage}%
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: 17, fontWeight: 700, color: "#4ade80" }}>
                                                        Rs. {offer.price.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 13, color: offer.stock === 0 ? "#f87171" : "#94a3b8" }}>
                                                📦 {offer.stock === 0 ? "Out of stock" : `${offer.stock} in stock`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto">
                                        <button
                                            className="mso-edit-btn"
                                            onClick={() => openEdit(offer)}
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 8, color: "#94a3b8", cursor: "pointer",
                                                fontWeight: 600, fontSize: 13, padding: "7px 16px", transition: "all 0.2s",
                                            }}
                                        >
                                            ✏️ Edit
                                        </button>

                                        {/* Pause (active offers only) */}
                                        {offer.isActive && (
                                            <button
                                                className="mso-disable-btn"
                                                onClick={() => setDisableTarget(offer)}
                                                style={S.btnRed}
                                            >
                                                ⏸️ Pause
                                            </button>
                                        )}

                                        {/* Resume (paused offers only) */}
                                        {!offer.isActive && (
                                            <button
                                                className="mso-resume-btn"
                                                onClick={() => setResumeTarget(offer)}
                                                style={{
                                                    background: "rgba(34,197,94,0.1)",
                                                    color: "#4ade80",
                                                    border: "1px solid rgba(34,197,94,0.25)",
                                                    borderRadius: 10, cursor: "pointer",
                                                    fontWeight: 600, fontSize: 13,
                                                    padding: "7px 16px", transition: "all 0.2s",
                                                }}
                                            >
                                                ▶️ Resume
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer meta */}
                {!loading && !error && offers.length > 0 && (
                    <p style={{ textAlign: "center", marginTop: 28, color: "#334155", fontSize: 12 }}>
                        Showing {filtered.length} of {offers.length} offers
                    </p>
                )}
            </div>
        </div>
    );
}
