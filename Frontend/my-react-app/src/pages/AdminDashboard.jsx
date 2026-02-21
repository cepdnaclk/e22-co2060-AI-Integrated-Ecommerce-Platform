import React from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "../components/ParticleCanvas";

export default function AdminDashboard() {
    const navigate = useNavigate();

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
                            System management, user administration, and global catalog control.
                        </p>
                    </div>
                    <button onClick={() => navigate("/")} style={S.btnGray}>← Back to Home</button>
                </div>

                {/* Dashboard Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>

                    {/* Catalog Management Card */}
                    <div className="ad-card" style={S.card}>
                        <div style={{ fontSize: 32, marginBottom: 16 }}>📦</div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#fff", margin: "0 0 8px 0" }}>Global Catalog</h2>
                        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.5, marginBottom: 24, minHeight: 42 }}>
                            Create new master products and define hardware variants (color, storage, sizes).
                        </p>
                        <button onClick={() => navigate("/admin/products/new")} style={{ ...S.btnPurple, width: "100%" }}>
                            Manage Products →
                        </button>
                    </div>

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
};
