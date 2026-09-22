import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "../components/ParticleCanvas";
import AdminMobileNav from "../components/AdminMobileNav";
import {
  fetchAllOrders,
  fetchOrderStats,
  updateOrderStatus,
  verifySellerQr,
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

const SELLER_QR_COLORS = {
  not_submitted: { bg: "rgba(71,85,105,0.2)", color: "#94a3b8", border: "rgba(71,85,105,0.35)" },
  pending: { bg: "rgba(234,179,8,0.15)", color: "#facc15", border: "rgba(234,179,8,0.35)" },
  approved: { bg: "rgba(34,197,94,0.15)", color: "#4ade80", border: "rgba(34,197,94,0.35)" },
  rejected: { bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.35)" },
};

const SELLER_QR_LABELS = {
  not_submitted: "Not submitted",
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
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
  const [verificationNote, setVerificationNote] = useState("");

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

  useEffect(() => {
    setVerificationNote(selectedOrder?.sellerQr?.verificationNote || "");
  }, [selectedOrder]);

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

  const handleSellerQrVerification = async (orderId, action) => {
    try {
      setUpdating(true);
      const result = await verifySellerQr(orderId, action, verificationNote);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? result.order : o))
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(result.order);
      }
    } catch (err) {
      alert("Failed to verify seller proof: " + err.message);
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
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] text-white font-sans relative overflow-x-hidden p-4 sm:p-6 lg:p-10">
      <ParticleCanvas />

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        .ao-card { animation: fadeIn 0.4s ease forwards; }
        .ao-row:hover { background: rgba(168,85,247,0.06); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8 border-b border-white/10 pb-8">
          <div className="text-center md:text-left">
            <button 
              onClick={() => navigate("/admin/dashboard")} 
              className="text-purple-400 text-xs font-bold uppercase tracking-widest hover:text-purple-300 transition-colors mb-2 block w-full md:w-auto"
            >
              ← Dashboard
            </button>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
              Order Management
            </h1>
            <p className="text-slate-400 text-sm mt-2">Track, verify, and fulfill customer shipments platform-wide.</p>
          </div>
        </div>

        {/* ── Stats Strip (Horizontal Scroll on Mobile) ── */}
        {stats && (
          <div className="flex overflow-x-auto gap-4 pb-4 mb-8 no-scrollbar snap-x">
            {[
              { label: "Total", value: stats.total, icon: "📊", color: "text-slate-200" },
              { label: "Pending", value: stats.pending, icon: "⏳", color: "text-yellow-400" },
              { label: "Confirmed", value: stats.confirmed, icon: "✅", color: "text-blue-400" },
              { label: "Shipped", value: stats.shipped, icon: "🚚", color: "text-purple-400" },
              { label: "Delivered", value: stats.delivered, icon: "📦", color: "text-emerald-400" },
              { label: "Revenue", value: formatCurrency(stats.revenue), icon: "💰", color: "text-emerald-400" },
            ].map((s, i) => (
              <div key={i} className="ao-card flex-shrink-0 w-36 sm:w-44 bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex flex-col items-center gap-2 snap-center">
                <span className="text-2xl">{s.icon}</span>
                <span className={`text-xl sm:text-2xl font-black ${s.color}`}>{s.value}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 items-center">
          <div className="flex overflow-x-auto gap-2 w-full lg:w-auto pb-2 lg:pb-0 no-scrollbar">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setFilter(s); setPage(1); }}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold border transition-all
                  ${filter === s ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}
                `}
              >
                {s === "all" ? "All" : `${STATUS_ICONS[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by email, shop, or ID…"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-purple-500/50 transition-all placeholder-slate-600"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* ── Main Layout ── */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Order List */}
          <div className={`flex-1 transition-all ${selectedOrder ? "hidden lg:block lg:w-3/5" : "w-full"}`}>
            {loading ? (
              <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/10">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Syncing orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/10">
                <div className="text-5xl mb-4 opacity-30">📭</div>
                <p className="text-slate-500 font-bold">No orders match your criteria.</p>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                
                {/* Desktop Header */}
                <div className="hidden lg:grid grid-cols-[100px_1fr_120px_120px_140px] gap-4 px-8 py-5 bg-white/5 border-b border-white/10">
                  {["ID", "Customer", "Total", "Status", "Date"].map((h, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-widest font-black text-slate-500">{h}</span>
                  ))}
                </div>

                {/* Rows / Cards */}
                <div className="flex flex-col">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      onClick={() => setSelectedOrder(order)}
                      className={`flex flex-col lg:grid lg:grid-cols-[100px_1fr_120px_120px_140px] gap-4 px-8 py-6 lg:py-5 border-b border-white/5 transition-all ao-row cursor-pointer
                        ${selectedOrder?._id === order._id ? "bg-purple-500/10 border-l-4 border-l-purple-500" : ""}
                      `}
                    >
                      <div className="flex justify-between items-center lg:block">
                        <span className="font-mono text-purple-400 text-sm font-bold">#{order._id.slice(-8)}</span>
                        <div className="lg:hidden">
                           <StatusBadge status={order.status} />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white truncate max-w-[200px]">{order.userId?.email || "Guest"}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-black mt-1">{order.sellerId?.shopName || "Unknown Seller"}</span>
                      </div>

                      <div className="flex justify-between items-center lg:block">
                        <span className="lg:hidden text-[9px] uppercase font-black text-slate-600">Total</span>
                        <span className="text-base lg:text-sm font-black text-emerald-400">{formatCurrency(order.totalAmount)}</span>
                      </div>

                      <div className="hidden lg:flex items-center">
                        <StatusBadge status={order.status} />
                      </div>

                      <div className="flex justify-between items-center lg:block">
                        <span className="lg:hidden text-[9px] uppercase font-black text-slate-600">Date</span>
                        <span className="text-xs text-slate-500">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-6 mt-10 pb-10">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all border
                    ${page <= 1 ? "opacity-30 border-white/5" : "bg-white/5 border-white/10 hover:bg-white/10 active:scale-95"}
                  `}
                >
                  ← Prev
                </button>
                <span className="text-slate-500 text-xs font-bold">
                  Page <span className="text-white">{page}</span> of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all border
                    ${page >= totalPages ? "opacity-30 border-white/5" : "bg-white/5 border-white/10 hover:bg-white/10 active:scale-95"}
                  `}
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedOrder && (
            <div className="fixed inset-0 lg:relative lg:inset-auto z-[100] lg:z-0 lg:flex-1 animate-slideIn">
              <div className="absolute inset-0 lg:hidden bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
              
              <div className="relative h-full lg:h-auto bg-slate-900 lg:bg-white/5 lg:backdrop-blur-xl border-l lg:border border-white/10 lg:rounded-3xl shadow-2xl flex flex-col max-w-2xl ml-auto">
                
                {/* Detail Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 lg:bg-transparent">
                  <div>
                    <h3 className="text-lg font-bold text-white">Order Details</h3>
                    <p className="text-[10px] font-mono text-purple-400">ID: {selectedOrder._id}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-all">✕</button>
                </div>

                <div className="p-6 overflow-y-auto max-h-screen lg:max-h-[70vh]">
                  
                  {/* Order Overview Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <InfoBlock label="Date" value={formatDate(selectedOrder.createdAt)} />
                    <InfoBlock label="Customer" value={selectedOrder.userId?.email || "N/A"} />
                    <div className="col-span-2">
                       <InfoBlock label="Store" value={selectedOrder.sellerId?.shopName || "N/A"} />
                    </div>
                  </div>

                  {/* Tracking Section */}
                  <div className="mb-10">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-6">Tracking Timeline</h4>
                    <OrderTimeline status={selectedOrder.status} />
                  </div>

                  {/* Action Row */}
                  {NEXT_STATUS[selectedOrder.status]?.length > 0 && (
                    <div className="mb-10 p-5 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                      <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Advance Order Lifecycle</h4>
                      <div className="flex flex-wrap gap-3">
                        {NEXT_STATUS[selectedOrder.status].map((s) => (
                          <button
                            key={s}
                            disabled={updating}
                            onClick={() => handleStatusChange(selectedOrder._id, s)}
                            className="flex-1 min-w-[140px] px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95"
                            style={{
                              background: STATUS_COLORS[s].bg,
                              color: STATUS_COLORS[s].color,
                              border: `1px solid ${STATUS_COLORS[s].border}`,
                              opacity: updating ? 0.5 : 1,
                            }}
                          >
                            {STATUS_ICONS[s]} Mark as {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="mb-10">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Line Items</h4>
                    <div className="space-y-4">
                      {selectedOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="flex-grow">
                            <p className="text-sm font-bold text-slate-200">{item.productId?.productName || "Product"}</p>
                            <p className="text-xs text-slate-500">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                          </div>
                          <span className="text-sm font-black text-purple-400">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-6 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                      <span className="text-xs font-bold text-slate-400">Grand Total</span>
                      <span className="text-xl font-black text-emerald-400">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {selectedOrder.shippingAddress && (
                    <div className="mb-10">
                      <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Shipping Destination</h4>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-2">
                        <p className="text-sm font-black text-white">{selectedOrder.shippingAddress.fullName}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.city}<br />
                          {selectedOrder.shippingAddress.postalCode}<br />
                          <span className="text-purple-400 font-bold">📞 {selectedOrder.shippingAddress.phone}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Seller QR Section */}
                  <div className="mb-6">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-500 mb-4">Seller Compliance</h4>
                    <SellerQrBadge status={selectedOrder.sellerQr?.verificationStatus || "not_submitted"} />
                    
                    {selectedOrder.sellerQr?.proofImageUrl ? (
                      <div className="mt-6 space-y-6">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-[11px] space-y-2">
                           <div className="flex justify-between"><span className="text-slate-500">Packed:</span> <span className="text-white font-bold">{selectedOrder.sellerQr?.packingProductName}</span></div>
                           <div className="flex justify-between"><span className="text-slate-500">SKU/IMEI:</span> <span className="text-white font-mono">{selectedOrder.sellerQr?.packingSkuOrImei}</span></div>
                        </div>
                        <img src={selectedOrder.sellerQr.proofImageUrl} alt="Proof" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
                        
                        <textarea
                          placeholder="Verification notes..."
                          value={verificationNote}
                          onChange={(e) => setVerificationNote(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-purple-500/50 min-h-[100px]"
                        />
                        
                        <div className="flex gap-3">
                          <button
                            disabled={updating}
                            onClick={() => handleSellerQrVerification(selectedOrder._id, "approve")}
                            className="flex-1 py-4 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            disabled={updating}
                            onClick={() => handleSellerQrVerification(selectedOrder._id, "reject")}
                            className="flex-1 py-4 bg-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 shadow-lg shadow-rose-500/20 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-xs text-slate-500 italic">No packing proof submitted by seller.</div>
                    )}
                  </div>
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

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span 
      className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}
    >
      {STATUS_ICONS[status]} {status}
    </span>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
      <p className="text-[9px] uppercase tracking-widest font-black text-slate-500 mb-1">{label}</p>
      <p className="text-xs text-white font-bold truncate">{value}</p>
    </div>
  );
}

function SellerQrBadge({ status }) {
  const key = SELLER_QR_COLORS[status] ? status : "not_submitted";
  const c = SELLER_QR_COLORS[key];
  return (
    <span 
      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}
    >
      🧾 {SELLER_QR_LABELS[key]}
    </span>
  );
}

function OrderTimeline({ status }) {
  const steps = ["pending", "confirmed", "shipped", "delivered"];
  const currentIdx = steps.indexOf(status);
  const isCancelled = status === "cancelled";

  return (
    <div className="flex justify-between items-center px-4">
      {steps.map((step, i) => {
        const isActive = !isCancelled && i <= currentIdx;
        const c = isActive ? STATUS_COLORS[step] : { bg: "rgba(255,255,255,0.04)", color: "#475569", border: "rgba(255,255,255,0.08)" };
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-xl"
                style={{ background: c.bg, borderColor: c.border }}
              >
                {STATUS_ICONS[step]}
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter" style={{ color: c.color }}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-[-10px] mb-4 bg-white/10 relative overflow-hidden">
                 <div 
                    className="absolute inset-0 bg-purple-500 transition-all duration-1000" 
                    style={{ width: !isCancelled && i < currentIdx ? "100%" : "0%" }}
                 />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

