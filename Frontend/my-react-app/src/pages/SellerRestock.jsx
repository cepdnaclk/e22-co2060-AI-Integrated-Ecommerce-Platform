import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getRestockPriorities } from "../services/restockService";
import { getMySellerProfile } from "../services/sellerService";
import "./sellerDashboard.css";

const TIER_STYLES = {
  CRITICAL: { bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.25)" },
  HIGH:     { bg: "rgba(251,146,60,0.12)", color: "#fb923c", border: "rgba(251,146,60,0.25)" },
  MEDIUM:   { bg: "rgba(250,204,21,0.12)", color: "#facc15", border: "rgba(250,204,21,0.25)" },
  LOW:      { bg: "rgba(34,197,94,0.12)",  color: "#4ade80", border: "rgba(34,197,94,0.25)" },
};

const SellerRestock = () => {
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scoringMode, setScoringMode] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Please log in as a seller.");

        const [sellerInfo, restock] = await Promise.all([
          getMySellerProfile(),
          getRestockPriorities(),
        ]);
        setSeller(sellerInfo);
        setItems(restock.data || []);
        setSummary(restock.summary || {});
        setScoringMode(restock.scoringMode || "unknown");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div style={styles.pg}>
      <div style={styles.loader}>
        <div style={styles.spin} />
        <p style={{ color: "#94a3b8", marginTop: 16 }}>Analyzing your inventory…</p>
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
        .tier-badge { display:inline-flex; padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
        .score-bar { height:6px; border-radius:3px; background:rgba(255,255,255,0.06); overflow:hidden; min-width:80px; }
        .score-fill { height:100%; border-radius:3px; transition:width 0.6s ease; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 1100, animation: "fadeIn .6s ease forwards" }}>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#fff" }}>🔄 Restock Priorities</h1>
            <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 15 }}>
              AI-powered restocking recommendations for <strong>{seller?.shopName || "your store"}</strong>
              <span style={{
                marginLeft: 12,
                padding: "3px 10px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                background: scoringMode === "ml_ensemble" ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)",
                color: scoringMode === "ml_ensemble" ? "#4ade80" : "#fbbf24",
                border: `1px solid ${scoringMode === "ml_ensemble" ? "rgba(34,197,94,0.25)" : "rgba(251,191,36,0.25)"}`,
              }}>
                {scoringMode === "ml_ensemble" ? "🤖 ML Ensemble" : "📐 Deterministic Fallback"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/seller/dashboard" style={{ ...styles.btnGray, textDecoration: "none" }}>← Dashboard</Link>
            <Link to="/seller/offers" style={{ ...styles.btnGray, textDecoration: "none" }}>My Offers</Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          <SummaryCard label="Total Products" value={summary.total} emoji="📦" color="#60a5fa" bgColor="rgba(59,130,246,0.15)" />
          <SummaryCard label="Critical" value={summary.critical} emoji="🚨" color="#f87171" bgColor="rgba(239,68,68,0.15)" />
          <SummaryCard label="High Priority" value={summary.high} emoji="⚠️" color="#fb923c" bgColor="rgba(251,146,60,0.15)" />
          <SummaryCard label="Medium" value={summary.medium} emoji="📋" color="#facc15" bgColor="rgba(250,204,21,0.15)" />
          <SummaryCard label="Low" value={summary.low} emoji="✅" color="#4ade80" bgColor="rgba(34,197,94,0.15)" />
        </div>

        {/* Restock Table */}
        <div className="dcard" style={{ padding: "28px 0" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 20, padding: "0 24px", display: "flex", alignItems: "center", gap: 10 }}>
            📊 Restock Ranking
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Demand/Day</th>
                  <th>Days Left</th>
                  <th>Score</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "40px 16px", color: "#64748b" }}>
                      No active products found. Add offers to get restock recommendations.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const tierStyle = TIER_STYLES[item.tier] || TIER_STYLES.LOW;
                    const barColor = item.tier === "CRITICAL" ? "#ef4444"
                      : item.tier === "HIGH" ? "#f97316"
                      : item.tier === "MEDIUM" ? "#eab308"
                      : "#22c55e";
                    return (
                      <tr key={item.offerId}>
                        <td style={{ fontWeight: 700, color: "#64748b", width: 40 }}>{item.rank}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {item.productImage && (
                              <img src={item.productImage} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: "#fff", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.productName}
                              </div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>{item.category}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: item.currentStock <= 5 ? "#f87171" : "#e2e8f0" }}>
                          {item.currentStock}
                        </td>
                        <td>{item.metrics.demandRate}</td>
                        <td style={{ fontWeight: 600, color: item.metrics.daysOfSupply <= 7 ? "#f87171" : item.metrics.daysOfSupply <= 30 ? "#facc15" : "#e2e8f0" }}>
                          {item.metrics.daysOfSupply > 180 ? "180+" : item.metrics.daysOfSupply}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, color: tierStyle.color, fontSize: 13, minWidth: 40 }}>
                              {(item.score * 100).toFixed(1)}%
                            </span>
                            <div className="score-bar">
                              <div className="score-fill" style={{ width: `${item.score * 100}%`, background: barColor }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="tier-badge" style={{
                            background: tierStyle.bg,
                            color: tierStyle.color,
                            border: `1px solid ${tierStyle.border}`,
                          }}>
                            {item.tier}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, color: tierStyle.color, fontWeight: 500 }}>{item.action}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{item.responseTime}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metrics Legend */}
        {items.length > 0 && (
          <div className="dcard" style={{ marginTop: 24, padding: "20px 24px" }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              How Priority Score Works
            </h4>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              Products are scored from 0–100% based on <strong style={{ color: "#e2e8f0" }}>demand rate</strong>,{" "}
              <strong style={{ color: "#e2e8f0" }}>current stock level</strong>,{" "}
              <strong style={{ color: "#e2e8f0" }}>lead time</strong>, and{" "}
              <strong style={{ color: "#e2e8f0" }}>profit margin</strong>.
              {" "}Higher scores mean more urgent restocking is needed.
              {" "}<span style={{ color: "#f87171" }}>CRITICAL</span> items risk stockout within days.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, emoji, color, bgColor }) => (
  <div className="dcard" style={{ padding: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div className="stat-title">{label}</div>
        <div className="stat-value" style={{ fontSize: 28 }}>{value}</div>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: bgColor, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
        {emoji}
      </div>
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
    transition: "background 0.2s",
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

export default SellerRestock;
