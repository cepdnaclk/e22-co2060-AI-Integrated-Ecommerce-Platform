import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate, Link } from "react-router-dom";
import { getMySellerProfile } from "../services/sellerService";
import { getMySellerOrderDetails } from "../services/sellerOrderQrService";
import "./sellerDashboard.css";

import API_BASE_URL from "../config/api";

const API = `${API_BASE_URL}/api/sellers/dashboard/stats`;

const SellerDashboard = () => {
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const formatMoney = (amount) =>
    `Rs. ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const handleOpenOrderDetails = async (orderId) => {
    try {
      setDetailsError("");
      setDetailsLoadingId(orderId);
      const orderDetails = await getMySellerOrderDetails(orderId);
      setSelectedOrder(orderDetails);
    } catch (err) {
      setDetailsError(err.message || "Failed to load order details");
    } finally {
      setDetailsLoadingId("");
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please log in as a seller.");

        // Fetch seller profile basics
        const sellerInfo = await getMySellerProfile();
        setSeller(sellerInfo);

        // Fetch dashboard analytical stats
        const res = await fetch(API, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json.message);
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return (
    <div style={styles.pg}>
      <div style={styles.loader}>
        <div style={styles.spin} />
        <p style={{ color: "#94a3b8", marginTop: 16 }}>Loading your dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={styles.pg}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
        <button style={styles.btnBlue} onClick={() => navigate("/login")}>Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-12" style={styles.pg}>
      <style>{`
                @keyframes fadeIn { from {opacity:0; transform:translateY(15px)} to {opacity:1; transform:translateY(0)} }
                @keyframes _spin { to {transform:rotate(360deg)} }
                .dcard { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; transition:transform 0.2s, box-shadow 0.2s; backdrop-filter:blur(10px); }
                .dcard:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(5,130,202,0.15); border-color:rgba(5,130,202,0.3); }
                .stat-title { font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; font-weight:600; }
                .stat-value { font-size:32px; color:#fff; font-weight:700; }
                .tbl { width:100%; border-collapse:collapse; text-align:left; }
                .tbl th { color:#94a3b8; font-size:12px; text-transform:uppercase; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08); font-weight:600; white-space:nowrap; }
                .tbl td { padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.04); color:#e2e8f0; font-size:14px; white-space:nowrap; }
                .tbl tr:hover td { background:rgba(255,255,255,0.02); }
                .status-badge { display:inline-flex; padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:600; text-transform:uppercase; }
                .recharts-tooltip-cursor { fill: rgba(255,255,255,0.05) !important; }
            `}</style>

      <div style={{ width: "100%", maxWidth: 1100, animation: "fadeIn .6s ease forwards" }}>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#fff" }}>Seller Dashboard</h1>
            <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 15 }}>Welcome back, <strong>{seller?.shopName || "Seller"}</strong></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/seller/restock" style={{ ...styles.btnGray, textDecoration: "none", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>🔄 Restock</Link>
            <Link to="/seller/orders/qr" style={{ ...styles.btnGray, textDecoration: "none", background: "rgba(5,130,202,0.1)", border: "1px solid rgba(5,130,202,0.3)", color: "#7dd3fc" }}>🧾 Seller QR</Link>
            <Link to="/seller/offers" style={{ ...styles.btnGray, textDecoration: "none" }}>My Offers</Link>
            <Link to="/seller/marketing-scheduler" style={{ ...styles.btnGray, textDecoration: "none" }}>📣 Marketing Scheduler</Link>
            <Link to="/seller/offers/new" style={{ ...styles.btnBlue, textDecoration: "none" }}>+ New Offer</Link>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>

          <div className="dcard">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="stat-title">Total Revenue</div>
                <div className="stat-value">${(data.metrics.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(34,197,94,0.15)", color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                💰
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#4ade80", marginTop: 12, fontWeight: 500 }}>All-time total sales</div>
          </div>

          <div className="dcard">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="stat-title">Total Orders</div>
                <div className="stat-value">{data.metrics.totalOrders || 0}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(59,130,246,0.15)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                📦
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 12 }}>Lifetime orders placed</div>
          </div>

          <div className="dcard">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="stat-title">Active Products</div>
                <div className="stat-value">{data.metrics.totalProducts || 0}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(168,85,247,0.15)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                🏷️
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 12 }}>Currently listed in your store</div>
          </div>

        </div>

        {/* ── PROGRESS GRAPH ── */}
        <div className="dcard" style={{ marginBottom: 32, padding: "28px 24px" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            📈 Revenue Progress
          </h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <AreaChart data={data.monthlyProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0582ca" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#0582ca" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#fff" }}
                  itemStyle={{ color: "#4ac6ff", fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4ac6ff" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── RECENT ORDERS TABLE ── */}
        <div className="dcard" style={{ padding: "28px 0" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 8, padding: "0 24px" }}>Recent Orders</h3>
          <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 14px", padding: "0 24px" }}>
            Click a row to view full order details and delivery center handover info.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(!data.recentOrders || data.recentOrders.length === 0) ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                      No recent orders found. Your sales journey starts soon!
                    </td>
                  </tr>
                ) : (
                  data.recentOrders.map(order => (
                    <tr
                      key={order._id}
                      onClick={() => handleOpenOrderDetails(order._id)}
                      style={{
                        cursor: "pointer",
                        background: selectedOrder?._id === order._id ? "rgba(59,130,246,0.08)" : "transparent"
                      }}
                    >
                      <td style={{ fontFamily: "monospace", color: "#94a3b8" }}>#{order._id.slice(-6).toUpperCase()}</td>
                      <td>{order.userId?.firstName} {order.userId?.lastName}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(order.totalAmount)}</td>
                      <td>
                        <span className="status-badge" style={{
                          background: order.status === "delivered" ? "rgba(34,197,94,0.1)" : order.status === "shipped" ? "rgba(59,130,246,0.1)" : "rgba(251,191,36,0.1)",
                          color: order.status === "delivered" ? "#4ade80" : order.status === "shipped" ? "#60a5fa" : "#fbbf24",
                          border: `1px solid ${order.status === "delivered" ? "rgba(34,197,94,0.2)" : order.status === "shipped" ? "rgba(59,130,246,0.2)" : "rgba(251,191,36,0.2)"}`
                        }}>
                          {order.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(detailsLoadingId || detailsError || selectedOrder) ? (
          <div className="dcard mt-6 border border-white/10 shadow-2xl relative overflow-hidden" style={{ padding: "28px" }}>
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h3 className="text-xl font-black text-white m-0 tracking-wide">Order Details</h3>
                {selectedOrder && (
                  <p className="text-xs font-mono text-blue-400 mt-1">ID: {selectedOrder._id}</p>
                )}
              </div>
              {selectedOrder && (
                <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg" style={{
                  background: selectedOrder.status === "delivered" ? "rgba(34,197,94,0.15)" : selectedOrder.status === "shipped" ? "rgba(59,130,246,0.15)" : "rgba(251,191,36,0.15)",
                  color: selectedOrder.status === "delivered" ? "#4ade80" : selectedOrder.status === "shipped" ? "#60a5fa" : "#fbbf24",
                  border: `1px solid ${selectedOrder.status === "delivered" ? "rgba(34,197,94,0.3)" : selectedOrder.status === "shipped" ? "rgba(59,130,246,0.3)" : "rgba(251,191,36,0.3)"}`
                }}>
                  {selectedOrder.status || "Pending"}
                </span>
              )}
            </div>

            {detailsLoadingId ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
              </div>
            ) : null}

            {!detailsLoadingId && detailsError ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-red-400 text-sm font-bold flex items-center gap-3">
                <span className="text-xl">⚠️</span> {detailsError}
              </div>
            ) : null}

            {!detailsLoadingId && !detailsError && selectedOrder ? (
              <div className="space-y-8 relative z-10">
                
                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoBox label="Customer" value={`${selectedOrder.userId?.firstName || ""} ${selectedOrder.userId?.lastName || ""}`.trim() || "N/A"} icon="👤" />
                  <InfoBox label="Contact" value={selectedOrder.userId?.email || "N/A"} subValue={selectedOrder.shippingAddress?.phone || selectedOrder.userId?.phone || "N/A"} icon="📧" />
                  <InfoBox label="Order Date" value={new Date(selectedOrder.createdAt).toLocaleDateString()} subValue={new Date(selectedOrder.createdAt).toLocaleTimeString()} icon="📅" />
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-2xl p-4 border border-emerald-500/20 flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-black mb-1">Grand Total</p>
                    <p className="text-2xl font-black text-emerald-400 drop-shadow-md">{formatMoney(selectedOrder.totalAmount)}</p>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Items & Financials */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                      <div className="p-5 border-b border-white/10 bg-white/5">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 m-0">
                          <span className="text-base">🛍️</span> Order Items
                        </h4>
                      </div>
                      
                      {(selectedOrder.items || []).length > 0 ? (
                        <div className="divide-y divide-white/5">
                          {selectedOrder.items.map((item, index) => (
                            <div key={`${selectedOrder._id}-itm-${index}`} className="p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl shadow-inner border border-white/10">📦</div>
                                <div>
                                  <p className="text-sm font-bold text-slate-200">{item.productId?.productName || "Product"}</p>
                                  <p className="text-xs text-slate-500 font-medium mt-1">Qty: {Number(item.quantity || 0)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-black text-white">{formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">{formatMoney(item.price)} each</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-500 text-sm font-medium">No item details available.</div>
                      )}
                      
                      {/* Summary Footer */}
                      <div className="bg-slate-900/50 p-6 space-y-3">
                        <div className="flex justify-between text-sm font-medium text-slate-400">
                          <span>Product Total</span>
                          <span>{formatMoney(selectedOrder.productTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-slate-400">
                          <span>Delivery Charge</span>
                          <span>{formatMoney(selectedOrder.deliveryCharge)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4">
                          <span className="text-sm font-black uppercase tracking-widest text-slate-300">Total Amount</span>
                          <span className="text-xl font-black text-emerald-400 drop-shadow-md">{formatMoney(selectedOrder.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Handover Details */}
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl border border-white/10 h-full overflow-hidden shadow-xl flex flex-col">
                      <div className="p-5 border-b border-white/10 bg-white/5">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 m-0">
                          <span className="text-base">🏢</span> Delivery Handover
                        </h4>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col">
                        {selectedOrder.recommendedDeliveryCenter ? (
                          <div className="space-y-5 flex-1">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1.5">Center Name</p>
                              <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
                                {selectedOrder.recommendedDeliveryCenter.branchName || "N/A"}
                                {selectedOrder.recommendedDeliveryCenter.branchCode && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px]">
                                    {selectedOrder.recommendedDeliveryCenter.branchCode}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1.5">Address</p>
                              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                {[
                                  selectedOrder.recommendedDeliveryCenter.address,
                                  selectedOrder.recommendedDeliveryCenter.city,
                                  selectedOrder.recommendedDeliveryCenter.district,
                                  selectedOrder.recommendedDeliveryCenter.province,
                                  selectedOrder.recommendedDeliveryCenter.postalCode,
                                ].filter(Boolean).join(", ") || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-1.5">Contact</p>
                              <p className="text-sm font-mono text-slate-300 font-medium">
                                {selectedOrder.recommendedDeliveryCenter.phone || "N/A"}
                              </p>
                            </div>
                            
                            {/* Spacer to push button to bottom if needed */}
                            <div className="flex-1"></div>
                            
                            <div className="pt-5 border-t border-white/10 mt-auto">
                               <button 
                                 className="w-full py-3 bg-gradient-to-r from-blue-600/20 to-blue-500/20 hover:from-blue-600/40 hover:to-blue-500/40 text-blue-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg border border-blue-500/20 active:scale-[0.98]"
                                 onClick={() => window.open(`https://maps.google.com/?q=${selectedOrder.recommendedDeliveryCenter.lat},${selectedOrder.recommendedDeliveryCenter.lng}`)}
                               >
                                 View on Map 🗺️
                               </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
                            <div className="text-4xl opacity-40 mb-2">📍</div>
                            <p className="text-sm font-bold text-slate-300">
                              Delivery center is unavailable.
                            </p>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">
                              Add a seller location to get nearest center guidance for your handovers.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        ) : null}

      </div>
    </div>
  );
};

const InfoBox = ({ label, value, subValue, icon }) => (
  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-start gap-4 transition-all hover:bg-white/10 hover:border-white/20 shadow-lg">
    <div className="text-3xl mt-1 opacity-90">{icon}</div>
    <div className="overflow-hidden">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">{label}</p>
      <p className="text-sm font-bold text-white truncate">{value}</p>
      {subValue && <p className="text-xs font-medium text-slate-500 mt-1 truncate">{subValue}</p>}
    </div>
  </div>
);

const styles = {
  pg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
  },
  btnBlue: {
    background: "linear-gradient(to right, #006494, #0582ca)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    padding: "10px 22px",
  },
  btnGray: {
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    padding: "10px 22px",
    transition: "background 0.2s"
  },
  loader: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh",
  },
  spin: {
    width: 44, height: 44,
    border: "4px solid rgba(255,255,255,0.1)",
    borderTop: "4px solid #4ac6ff",
    borderRadius: "50%",
    animation: "_spin 1s linear infinite",
  },
};

export default SellerDashboard;
