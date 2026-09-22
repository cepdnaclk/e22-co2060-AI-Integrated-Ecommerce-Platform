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

    // AI & Facebook Automation State
    const [autoPostLoading, setAutoPostLoading] = useState(false);
    const [autoPostResult, setAutoPostResult] = useState(null);
    const [autoPostTone, setAutoPostTone] = useState("hype");
    const [autoPostMode, setAutoPostMode] = useState("now");
    const [trendingModalOpen, setTrendingModalOpen] = useState(false);
    const [trendingLoading, setTrendingLoading] = useState(false);
    const [trendingReport, setTrendingReport] = useState(null);
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [restockLoading, setRestockLoading] = useState(false);
    const [restockReport, setRestockReport] = useState(null);
    
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

    const handleTriggerAutoPost = async (overrideMode = null) => {
        const mode = overrideMode || autoPostMode;
        setAutoPostLoading(true);
        setAutoPostResult(null);
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/facebook/auto-post`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { Authorization: `Bearer ${token}` })
                },
                body: JSON.stringify({ mode, tone: autoPostTone, campaignType: "product_spotlight" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || data.error || "Failed to auto-post");
            setAutoPostResult({
                success: true,
                status: data.status,
                message: data.message || `Automated post generated (${data.status})`,
                product: data.campaign?.matched_product_name,
                headline: data.campaign?.headline
            });
        } catch (err) {
            setAutoPostResult({ success: false, message: err.message });
        } finally {
            setAutoPostLoading(false);
        }
    };

    const handleOpenTrendingModal = async () => {
        setTrendingModalOpen(true);
        setTrendingLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/trending/products`);
            const data = await res.json();
            setTrendingReport(data.report || data);
        } catch (err) {
            console.error("Failed to load trending products:", err);
        } finally {
            setTrendingLoading(false);
        }
    };

    const handleOpenRestockModal = async () => {
        setRestockModalOpen(true);
        setRestockLoading(true);
        try {
            const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/automation/restock/review`, {
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` })
                }
            });
            const data = await res.json();
            setRestockReport(data.review || data);
        } catch (err) {
            console.error("Failed to load restock review:", err);
        } finally {
            setRestockLoading(false);
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

                    {/* 🤖 AI Operations & Social Automation */}
                    <div className="ad-card bg-gradient-to-br from-purple-900/20 via-white/5 to-pink-900/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-8 flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between mb-5">
                            <div className="text-4xl">🤖</div>
                            <span className="px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-full text-[10px] font-black uppercase tracking-wider">
                                LangChain Active
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">AI & Social Auto-Poster</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            Autonomous YouTube trend detection & hands-free Facebook marketing campaign publishing.
                        </p>

                        {autoPostResult && (
                            <div className={`text-[11px] mb-4 p-2.5 rounded-xl border ${
                                autoPostResult.success
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                    : "bg-red-500/10 text-red-300 border-red-500/30"
                            }`}>
                                <p className="font-bold">{autoPostResult.message}</p>
                                {autoPostResult.product && (
                                    <p className="text-[10px] opacity-80 mt-0.5">Matched: {autoPostResult.product}</p>
                                )}
                            </div>
                        )}

                        {/* Controls for Tone and Mode */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Tone</label>
                                <select
                                    value={autoPostTone}
                                    onChange={(e) => setAutoPostTone(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                                >
                                    <option value="hype">🔥 Hype</option>
                                    <option value="professional">💼 Pro</option>
                                    <option value="discount_driven">🏷️ Deals</option>
                                    <option value="storytelling">📖 Story</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Mode</label>
                                <select
                                    value={autoPostMode}
                                    onChange={(e) => setAutoPostMode(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                                >
                                    <option value="now">⚡ Now</option>
                                    <option value="optimal_time">⏰ 7 PM</option>
                                    <option value="draft">📝 Draft</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-auto">
                            <button
                                onClick={() => handleTriggerAutoPost()}
                                disabled={autoPostLoading}
                                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {autoPostLoading ? "Publishing via AI..." : `🚀 Run Auto-Post (${autoPostMode.toUpperCase()})`}
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleOpenTrendingModal}
                                    className="py-2 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                >
                                    📈 YT Trending
                                </button>
                                <button
                                    onClick={handleOpenRestockModal}
                                    className="py-2 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                >
                                    📦 Restock POs
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* YouTube Trending Modal */}
                {trendingModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">📈</span>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">YouTube Trending Products Intelligence</h3>
                                        <p className="text-xs text-slate-400">Extracted & catalog-matched by LangChain</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTrendingModalOpen(false)}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4 flex-grow">
                                {trendingLoading ? (
                                    <div className="py-12 text-center text-slate-400 text-sm">
                                        Analyzing viral YouTube signals & matching catalog...
                                    </div>
                                ) : trendingReport?.top_trending_products?.length ? (
                                    <>
                                        <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl text-xs text-purple-200">
                                            {trendingReport.summary}
                                        </div>
                                        {trendingReport.top_trending_products.map((item, idx) => (
                                             <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase text-purple-400">{item.brand} • {item.category}</span>
                                                        <h4 className="font-bold text-sm text-white">{item.trending_product_name}</h4>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 whitespace-nowrap">
                                                        {item.trending_badge}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-300">{item.why_trending}</p>
                                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                                                    <span className="text-slate-400">Store Match: <strong className="text-emerald-400">{item.matched_store_product_name || "Similar in catalog"}</strong> ({Math.round(item.catalog_match_confidence * 100)}%)</span>
                                                    <span className="text-slate-400">Est. Price: <strong className="text-white">{item.estimated_price_range}</strong></span>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="py-8 text-center text-slate-400 text-sm">No trending reports available yet.</div>
                                )}
                            </div>

                            <div className="p-4 border-t border-white/10 bg-slate-950/50 flex justify-end">
                                <button
                                    onClick={() => setTrendingModalOpen(false)}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Restock PO Review Modal */}
                {restockModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">📦</span>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">AI Restock & Purchase Order Draft</h3>
                                        <p className="text-xs text-slate-400">Automated evaluation by LangChain Restock Agent</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setRestockModalOpen(false)}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4 flex-grow">
                                {restockLoading ? (
                                    <div className="py-12 text-center text-slate-400 text-sm">
                                        Evaluating inventory health, restock scores & drafting PO email...
                                    </div>
                                ) : restockReport ? (
                                    <>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-emerald-300">Urgency: {restockReport.overall_urgency || "NORMAL"}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{restockReport.summary}</p>
                                            </div>
                                            <span className="text-xs font-black px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg">
                                                {restockReport.items_to_restock?.length || 0} Critical Items
                                            </span>
                                        </div>

                                        {/* PO Email Draft */}
                                        {restockReport.supplier_email_draft && (
                                            <div className="bg-slate-950/80 border border-white/10 rounded-xl p-4 space-y-2">
                                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Formal Supplier PO Email Draft</p>
                                                <p className="text-xs font-bold text-white">Subject: {restockReport.supplier_email_draft.subject}</p>
                                                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans bg-white/5 p-3 rounded-lg border border-white/5">
                                                    {restockReport.supplier_email_draft.body}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Items breakdown */}
                                        {restockReport.items_to_restock?.map((item, idx) => (
                                            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-bold text-white">{item.product_name}</p>
                                                    <p className="text-[11px] text-slate-400">Current Stock: {item.current_stock} • Risk Score: {item.risk_score}</p>
                                                </div>
                                                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded font-bold text-[11px]">
                                                    Order +{item.recommended_order_quantity} units
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="py-8 text-center text-slate-400 text-sm">No restock alerts at this moment.</div>
                                )}
                            </div>

                            <div className="p-4 border-t border-white/10 bg-slate-950/50 flex justify-end">
                                <button
                                    onClick={() => setRestockModalOpen(false)}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                </div>

            </div>
            <AdminMobileNav />
        </div>
    );
}

