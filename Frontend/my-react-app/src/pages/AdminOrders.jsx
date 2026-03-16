import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "../components/ParticleCanvas";
import {
  fetchAllOrders,
  fetchOrderStats,
  updateOrderStatus,
} from "../services/adminOrderService";

const STATUSES = ["all", "pending", "confirmed", "shipped", "delivered", "cancelled"];

const STATUS_COLORS = {
  pending: { bg: "rgba(234,179,8,0.15)", color: "#facc15", border: "rgba(234,179,8,0.3)" },
  confirmed: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  shipped: { bg: "rgba(168,85,247,0.15)", color: "#c084fc", border: "rgba(168,85,247,0.3)" },
  delivered: { bg: "rgba(34,197,94,0.15)", color: "#4ade80", border: "rgba(34,197,94,0.3)" },
  cancelled: { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.3)" },
};

const STATUS_ICONS = {
  pending: "⏳",
  confirmed: "✅",
  shipped: "🚚",
  delivered: "📦",
  cancelled: "❌",
};

// Allowed next-status transitions
const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (filter !== "all") params.status = filter;
      if (search.trim()) params.search = search.trim();

      const data = await fetchAllOrders(params);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchOrderStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdating(true);
      const result = await updateOrderStatus(orderId, newStatus);
      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? result.order : o))
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(result.order);
      }
      loadStats();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  // ── Render ──
  return (
    <div style={S.pg}>
      <ParticleCanvas />
      <div style={{ width: "100%", maxWidth: 1200, position: "relative", zIndex: 1 }}>
        <style>{`
          @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          .ao-card { animation: fadeIn 0.5s ease forwards; }
          .ao-row { transition: background 0.15s; cursor: pointer; }
          .ao-row:hover { background: rgba(168,85,247,0.06) !important; }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <button onClick={() => navigate("/admin/dashboard")} style={S.backBtn}>← Dashboard</button>
            <h1 style={S.title}>📋 Order Management</h1>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
              View, track, and manage all platform orders
            </p>
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total", value: stats.total, icon: "📊", color: "#e2e8f0" },
              { label: "Pending", value: stats.pending, icon: "⏳", color: "#facc15" },
              { label: "Confirmed", value: stats.confirmed, icon: "✅", color: "#60a5fa" },
              { label: "Shipped", value: stats.shipped, icon: "🚚", color: "#c084fc" },
              { label: "Delivered", value: stats.delivered, icon: "📦", color: "#4ade80" },
              { label: "Cancelled", value: stats.cancelled, icon: "❌", color: "#f87171" },
              { label: "Revenue", value: formatCurrency(stats.revenue), icon: "💰", color: "#34d399" },
            ].map((s, i) => (
              <div key={i} className="ao-card" style={{ ...S.statCard, animationDelay: `${i * 0.05}s` }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1); }}
              style={{
                ...S.pill,
                background: filter === s ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                border: filter === s ? "1px solid rgba(168,85,247,0.5)" : "1px solid rgba(255,255,255,0.08)",
                color: filter === s ? "#c084fc" : "#94a3b8",
              }}
            >
              {s === "all" ? "All" : `${STATUS_ICONS[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
            </button>
          ))}
          <input
            type="text"
            placeholder="Search by email, shop, or order ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={S.searchInput}
          />
        </div>

        {/* Content Area */}
        <div style={{ display: "flex", gap: 20 }}>
          {/* Order List */}
          <div style={{ flex: selectedOrder ? "0 0 55%" : "1 1 100%", transition: "flex 0.3s" }}>
            {loading ? (
              <div style={S.emptyState}>Loading orders…</div>
            ) : orders.length === 0 ? (
              <div style={S.emptyState}>No orders found</div>
            ) : (
              <div style={S.tableWrap}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Order ID", "Customer", "Seller", "Total", "Status", "Date"].map((h) => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        className="ao-row"
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          background: selectedOrder?._id === order._id ? "rgba(168,85,247,0.08)" : "transparent",
                        }}
                      >
                        <td style={S.td}>
                          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#a78bfa" }}>
                            {order._id.slice(-8)}
                          </span>
                        </td>
                        <td style={S.td}>{order.userId?.email || "N/A"}</td>
                        <td style={S.td}>{order.sellerId?.shopName || "N/A"}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{formatCurrency(order.totalAmount)}</td>
                        <td style={S.td}>
                          <StatusBadge status={order.status} />
                        </td>
                        <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ ...S.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                <span style={{ color: "#94a3b8", fontSize: 13, padding: "8px 12px" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ ...S.pageBtn, opacity: page >= totalPages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Order Detail Panel */}
          {selectedOrder && (
            <div className="ao-card" style={S.detailPanel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: "#fff" }}>Order Details</h3>
                <button onClick={() => setSelectedOrder(null)} style={S.closeBtn}>✕</button>
              </div>

              {/* Order ID & Date */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Order ID</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, color: "#a78bfa" }}>{selectedOrder._id}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <InfoBlock label="Created" value={formatDate(selectedOrder.createdAt)} />
                <InfoBlock label="Updated" value={formatDate(selectedOrder.updatedAt)} />
                <InfoBlock label="Customer" value={selectedOrder.userId?.email || "N/A"} />
                <InfoBlock label="Seller" value={selectedOrder.sellerId?.shopName || "N/A"} />
              </div>

              {/* Status Tracking */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                  Status Tracking
                </div>
                <OrderTimeline status={selectedOrder.status} />
              </div>

              {/* Update Status */}
              {NEXT_STATUS[selectedOrder.status]?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Update Status
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {NEXT_STATUS[selectedOrder.status].map((s) => (
                      <button
                        key={s}
                        disabled={updating}
                        onClick={() => handleStatusChange(selectedOrder._id, s)}
                        style={{
                          ...S.statusBtn,
                          background: STATUS_COLORS[s].bg,
                          color: STATUS_COLORS[s].color,
                          border: `1px solid ${STATUS_COLORS[s].border}`,
                          opacity: updating ? 0.5 : 1,
                        }}
                      >
                        {STATUS_ICONS[s]} Mark as {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  Items ({selectedOrder.items.length})
                </div>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} style={S.itemRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#e2e8f0", fontSize: 13 }}>
                        {item.productId?.name || "Product"}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>Qty: {item.quantity}</div>
                    </div>
                    <div style={{ color: "#a78bfa", fontWeight: 600, fontSize: 14 }}>
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, marginTop: 8 }}>
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>Total</span>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Shipping Address
                  </div>
                  <div style={S.addressBox}>
                    <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>
                      {selectedOrder.shippingAddress.fullName}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
                      {selectedOrder.shippingAddress.street}<br />
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.postalCode}<br />
                      📞 {selectedOrder.shippingAddress.phone}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {STATUS_ICONS[status]} {status}
    </span>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{value}</div>
    </div>
  );
}

function OrderTimeline({ status }) {
  const steps = ["pending", "confirmed", "shipped", "delivered"];
  const currentIdx = steps.indexOf(status);
  const isCancelled = status === "cancelled";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((step, i) => {
        const isActive = !isCancelled && i <= currentIdx;
        const c = isActive ? STATUS_COLORS[step] : { bg: "rgba(255,255,255,0.04)", color: "#475569", border: "rgba(255,255,255,0.08)" };
        return (
          <React.Fragment key={step}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: c.bg, border: `2px solid ${c.border}`, fontSize: 14,
              }}>
                {STATUS_ICONS[step]}
              </div>
              <span style={{ fontSize: 10, color: c.color, textTransform: "capitalize" }}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, maxWidth: 40,
                background: !isCancelled && i < currentIdx ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.08)",
              }} />
            )}
          </React.Fragment>
        );
      })}
      {isCancelled && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginLeft: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: STATUS_COLORS.cancelled.bg, border: `2px solid ${STATUS_COLORS.cancelled.border}`, fontSize: 14,
          }}>
            ❌
          </div>
          <span style={{ fontSize: 10, color: STATUS_COLORS.cancelled.color }}>Cancelled</span>
        </div>
      )}
    </div>
  );
}

// ── Styles ──

const S = {
  pg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
    padding: "40px 32px",
    position: "relative",
    overflow: "hidden",
  },
  title: {
    fontSize: 28, fontWeight: 700, margin: "8px 0 4px",
    background: "linear-gradient(to right, #fff, #c084fc)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  backBtn: {
    background: "none", border: "none", color: "#a78bfa", cursor: "pointer",
    fontSize: 13, padding: 0, fontWeight: 600,
  },
  statCard: {
    background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
    padding: "16px 18px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
  },
  pill: {
    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s",
  },
  searchInput: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "8px 14px", color: "#e2e8f0", fontSize: 13,
    outline: "none", flex: 1, minWidth: 200,
  },
  tableWrap: {
    background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
    overflow: "hidden",
  },
  th: {
    textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 700,
    color: "#64748b", textTransform: "uppercase", letterSpacing: 1,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  td: {
    padding: "12px 14px", fontSize: 13, color: "#e2e8f0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  pageBtn: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "6px 14px", color: "#e2e8f0",
    fontSize: 12, cursor: "pointer",
  },
  detailPanel: {
    flex: "0 0 42%", background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, padding: "24px 22px", maxHeight: "calc(100vh - 120px)",
    overflowY: "auto", position: "sticky", top: 40,
  },
  closeBtn: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontSize: 14,
    width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
  },
  statusBtn: {
    padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "opacity 0.2s",
  },
  itemRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  addressBox: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10, padding: "12px 14px",
  },
  emptyState: {
    textAlign: "center", padding: "60px 20px", color: "#64748b",
    fontSize: 15,
  },
};
