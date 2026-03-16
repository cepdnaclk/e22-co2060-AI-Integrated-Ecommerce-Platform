import React from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "../components/ParticleCanvas";
import API_BASE_URL from "../config/api";

export default function AdminDashboard() {
    const navigate = useNavigate();
    
    // Get admin user info
    const adminUser = JSON.parse(localStorage.getItem("adminUser") || localStorage.getItem("user") || "{}");
    const isCEO = adminUser.role === "ceo";

    // Admin logout handler
    const handleLogout = async () => {
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
            if (token) {
                await fetch(`${API_BASE_URL}/api/admin/auth/logout`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (e) {
            console.error("Logout error:", e);
        }
        
        // Clear admin tokens
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        
        navigate("/admin/login");
    };

    return (
        <div style={S.pg}>
            <ParticleCanvas />

            {/* ── Background decoration ── */}
            <div style={{
                position: "fixed", width: 500, height: 500, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
                top: -100, right: -100, pointerEvents: "none", zIndex: 0,
            }} />

            <div style={{ width: "100%", maxWidth: 1000, position: "relative", zIndex: 1 }}>
                <style>{`
          @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          .ad-card { animation: fadeIn 0.5s ease forwards; transition: transform 0.2s, box-shadow 0.2s; }
          .ad-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(168,85,247,0.15); }
        `}</style>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 24 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                            <span style={{ fontSize: 28 }}>⚙️</span>
                            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, background: "linear-gradient(to right, #fff, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                Admin Portal
                            </h1>
                        </div>
                        <p style={{ color: "#94a3b8", fontSize: 15, margin: 0 }}>
                            Welcome back, {adminUser.firstName || "Admin"}! System management and global catalog control.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ color: "#a855f7", fontSize: 14 }}>
                            {isCEO ? "👑" : "🔒"} {adminUser.email}
                            <span style={{
                                marginLeft: 8,
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                background: isCEO ? "rgba(234,179,8,0.15)" : "rgba(168,85,247,0.15)",
                                color: isCEO ? "#facc15" : "#c084fc",
                                border: isCEO ? "1px solid rgba(234,179,8,0.3)" : "1px solid rgba(168,85,247,0.3)",
                            }}>
                                {isCEO ? "CEO" : "ADMIN"}
                            </span>
                        </span>
                        <button onClick={handleLogout} style={S.btnRed}>Logout</button>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>

                    <div className="ad-card" style={S.card}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>📦</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>Global Catalog</h2>
                        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, marginBottom: 24, minHeight: 42 }}>
                            Create, edit, and delete master products and manage hardware variants (color, storage, sizes).
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => navigate("/admin/products")} style={{ ...S.btnPurple, flex: 1 }}>
                                Manage Products →
                            </button>
                            <button onClick={() => navigate("/admin/products/new")} style={{ ...S.btnGray, padding: "12px 14px" }} title="Create new product">
                                +
                            </button>
                        </div>
                    </div>

                    {/* Order Management Card */}
                    <div className="ad-card" style={S.card}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>Order Management</h2>
                        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, marginBottom: 24, minHeight: 42 }}>
                            View all platform orders, track delivery status, and manage order lifecycle.
                        </p>
                        <button onClick={() => navigate("/admin/orders")} style={{ ...S.btnPurple, width: "100%" }}>
                            Manage Orders →
                        </button>
                    </div>

                    {/* Inventory Management Card */}
                    <div className="ad-card" style={S.card}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>📊</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>Inventory Management</h2>
                        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, marginBottom: 24, minHeight: 42 }}>
                            Monitor stock levels, manage inventory, view alerts, and track stock movements.
                        </p>
                        <button onClick={() => navigate("/admin/inventory")} style={{ ...S.btnPurple, width: "100%" }}>
                            Manage Inventory →
                        </button>
                    </div>

                    {/* Face Recognition Management Card — CEO only */}
                    {isCEO && (
                    <div className="ad-card" style={S.card}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>🔐</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>Face Recognition</h2>
                        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, marginBottom: 24, minHeight: 42 }}>
                            Register and manage face authentication for all admin users. Scan faces for secure login.
                        </p>
                        <button onClick={() => navigate("/admin/face-management")} style={{ ...S.btnPurple, width: "100%" }}>
                            Manage Faces →
                        </button>
                    </div>
                    )}

                    {/* User Management Card (Placeholder) */}
                    <div className="ad-card" style={{ ...S.card, opacity: 0.7 }}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>👥</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>Users & Roles</h2>
                        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, marginBottom: 24, minHeight: 42 }}>
                            Approve pending seller accounts, block users, or change system role assignments.
                        </p>
                        <button style={{ ...S.btnGray, width: "100%", cursor: "not-allowed" }}>
                            Coming Soon
                        </button>
                    </div>

                    {/* Platform Analytics Card (Placeholder) */}
                    <div className="ad-card" style={{ ...S.card, opacity: 0.7 }}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>📈</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>Platform Analytics</h2>
                        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, marginBottom: 24, minHeight: 42 }}>
                            View high-level volume metrics, transaction histories, and AI search performances.
                        </p>
                        <button style={{ ...S.btnGray, width: "100%", cursor: "not-allowed" }}>
                            Coming Soon
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
}

const S = {
    pg: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "60px 32px",
        position: "relative",
        overflow: "hidden"
    },
    card: {
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
    },
    btnPurple: {
        background: "linear-gradient(to right, #7e22ce, #a855f7)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        padding: "12px 22px",
        transition: "opacity 0.2s",
    },
    btnGray: {
        background: "rgba(255,255,255,0.05)",
        color: "#e2e8f0",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 20px",
        transition: "background 0.2s"
    },
    btnRed: {
        background: "linear-gradient(to right, #dc2626, #ef4444)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 20px",
        transition: "opacity 0.2s"
    },
};
