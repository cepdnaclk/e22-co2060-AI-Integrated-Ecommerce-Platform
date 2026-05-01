import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useNavigate, Link } from "react-router-dom";
import { getMySellerProfile } from "../services/sellerService";
import "./sellerDashboard.css";

import API_BASE_URL from "../config/api";

const API = `${API_BASE_URL}/api/sellers/dashboard/stats`;

const SellerDashboard = () => {
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <div style={styles.pg}>
      <style>{`
                @keyframes fadeIn { from {opacity:0; transform:translateY(15px)} to {opacity:1; transform:translateY(0)} }
                @keyframes _spin { to {transform:rotate(360deg)} }
                .dcard { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; transition:transform 0.2s, box-shadow 0.2s; backdrop-filter:blur(10px); }
                .dcard:hover { transform:translateY(-3px); box-shadow:0 12px 40px rgba(5,130,202,0.15); border-color:rgba(5,130,202,0.3); }
                .stat-title { font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; font-weight:600; }
                .stat-value { font-size:32px; color:#fff; font-weight:700; }
                .tbl { width:100%; border-collapse:collapse; text-align:left; }
                .tbl th { color:#94a3b8; font-size:12px; text-transform:uppercase; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.08); font-weight:600; }
                .tbl td { padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.04); color:#e2e8f0; font-size:14px; }
                .tbl tr:hover td { background:rgba(255,255,255,0.02); }
                .status-badge { display:inline-flex; padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:600; text-transform:uppercase; }
                .recharts-tooltip-cursor { fill: rgba(255,255,255,0.05) !important; }
            `}</style>

      <div style={{ width: "100%", maxWidth: 1100, animation: "fadeIn .6s ease forwards" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#fff" }}>Seller Dashboard</h1>
            <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 15 }}>Welcome back, <strong>{seller?.shopName || "Seller"}</strong></p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
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
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 20, padding: "0 24px" }}>Recent Orders</h3>
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
                    <tr key={order._id}>
                      <td style={{ fontFamily: "monospace", color: "#94a3b8" }}>#{order._id.slice(-6).toUpperCase()}</td>
                      <td>{order.userId?.firstName} {order.userId?.lastName}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>${(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

      </div>
    </div>
  );
};

const styles = {
  pg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
    padding: "48px 24px",
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
