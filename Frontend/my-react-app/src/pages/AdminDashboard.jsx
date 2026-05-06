import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "../components/ParticleCanvas";
import AdminMobileNav from "../components/AdminMobileNav";
import API_BASE_URL from "../config/api";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [centerStatusLoading, setCenterStatusLoading] = useState(false);
    const [centerStatusError, setCenterStatusError] = useState("");
    const [centerStatus, setCenterStatus] = useState(null);
    
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

    const loadCenterStatus = async () => {
        setCenterStatusLoading(true);
        setCenterStatusError("");
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
            if (!token) {
                throw new Error("Admin session not found");
            }

            const controlTowerRes = await fetch(`${API_BASE_URL}/api/dms/admin/centers/control-tower`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const controlTowerData = await controlTowerRes.json();
            if (!controlTowerRes.ok) {
                throw new Error(controlTowerData?.message || "Failed to load control tower status");
            }

            const totals = controlTowerData?.totals || {};

            setCenterStatus({
                totalCenters: totals.centers || 0,
                approvedCenters: totals.approvedCenters || 0,
                pendingCenters: totals.pendingCenters || 0,
                disabledCenters: totals.disabledCenters || 0,
                activeShipments: totals.activeShipments || 0,
                activeRiders: totals.activeRiders || 0,
                delayedShipments: totals.delayedShipments || 0,
            });
        } catch (err) {
            setCenterStatusError(err.message || "Failed to fetch center status");
        } finally {
            setCenterStatusLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] text-white font-sans relative overflow-x-hidden">
            <ParticleCanvas />

            {/* ── Background decoration ── */}
            <div className="fixed w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-purple-500/10 blur-[100px] -top-20 -right-20 pointer-events-none z-0" />

            <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 md:py-16 relative z-10">
                <style>{`
                  @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                  .ad-card { animation: fadeIn 0.5s ease forwards; transition: transform 0.2s, box-shadow 0.2s; }
                  .ad-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(168,85,247,0.15); }
                `}</style>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10 pb-8 border-b border-white/10">
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <span className="text-2xl sm:text-3xl">⚙️</span>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                                Admin Portal
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm sm:text-base">
                            Welcome back, <span className="text-purple-400 font-bold">{adminUser.firstName || "Admin"}</span>! System management center.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-3 px-2">
                            <span className="text-lg">{isCEO ? "👑" : "🔒"}</span>
                            <div className="text-left">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none mb-1">Authenticated as</p>
                                <p className="text-xs text-slate-300 font-medium truncate max-w-[150px]">{adminUser.email}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                isCEO ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            }`}>
                                {isCEO ? "CEO" : "ADMIN"}
                            </span>
                        </div>
                        <button 
                            onClick={handleLogout} 
                            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 hover:opacity-90 active:scale-95 transition-all"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Global Catalog */}
                    <div className="ad-card bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col">
                        <div className="text-4xl mb-5">📦</div>
                        <h2 className="text-xl font-bold text-white mb-2">Global Catalog</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            Create, edit, and delete master products and manage hardware variants.
                        </p>
                        <div className="flex gap-3 mt-auto">
                            <button onClick={() => navigate("/admin/products")} className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                                Manage Products →
                            </button>
                            <button onClick={() => navigate("/admin/products/new")} className="px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xl font-bold hover:bg-white/10 transition-all" title="Create new product">
                                +
                            </button>
                        </div>
                    </div>

                    {/* Order Management */}
                    <div className="ad-card bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col">
                        <div className="text-4xl mb-5">📋</div>
                        <h2 className="text-xl font-bold text-white mb-2">Orders</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            View all platform orders, track delivery status, and manage order lifecycle.
                        </p>
                        <button onClick={() => navigate("/admin/orders")} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                            Manage Orders →
                        </button>
                    </div>

                    {/* Inventory Management */}
                    <div className="ad-card bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col">
                        <div className="text-4xl mb-5">📊</div>
                        <h2 className="text-xl font-bold text-white mb-2">Inventory</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            Monitor stock levels, manage inventory, view alerts, and track stock movements.
                        </p>
                        <button onClick={() => navigate("/admin/inventory")} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                            Manage Inventory →
                        </button>
                    </div>

                    {/* Face Recognition — CEO only */}
                    {isCEO && (
                    <div className="ad-card bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col">
                        <div className="text-4xl mb-5">🔐</div>
                        <h2 className="text-xl font-bold text-white mb-2">Face Recognition</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            Register and manage face authentication for all admin users.
                        </p>
                        <button onClick={() => navigate("/admin/face-management")} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                            Manage Faces →
                        </button>
                    </div>
                    )}

                    {/* Bookkeeping Console */}
                    <div className="ad-card bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col">
                        <div className="text-4xl mb-5">💹</div>
                        <h2 className="text-xl font-bold text-white mb-2">Bookkeeping</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow">
                            Manage automated accounting events and view financial statements.
                        </p>
                        <button onClick={() => navigate("/admin/bookkeeping")} className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                            Open Console →
                        </button>
                    </div>

                    {/* Delivery Center Monitoring */}
                    <div className="ad-card bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col">
                        <div className="text-4xl mb-5">🚚</div>
                        <h2 className="text-xl font-bold text-white mb-2">DMS Control Tower</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            Operational status of centers and shipments.
                        </p>
                        {centerStatusError && (
                            <div className="text-[11px] text-red-400 mb-4 bg-red-400/10 p-2 rounded-lg border border-red-400/20">
                                {centerStatusError}
                            </div>
                        )}
                        {centerStatus && (
                            <div className="mb-6 grid grid-cols-2 gap-2">
                                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Centers</p>
                                    <p className="text-sm font-bold">{centerStatus.totalCenters}</p>
                                </div>
                                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Shipments</p>
                                    <p className="text-sm font-bold text-emerald-400">{centerStatus.activeShipments}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2 mt-auto">
                            <button onClick={loadCenterStatus} className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                                {centerStatusLoading ? "..." : "Refresh"}
                            </button>
                            <button onClick={() => navigate("/admin/dms-control")} className="flex-[2] px-3 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all">
                                Open Tower →
                            </button>
                        </div>
                    </div>

                </div>

            </div>
            <AdminMobileNav />
        </div>
    );
}

