/**
 * ======================================================
 * ADMIN PAYOUTS PAGE
 * ======================================================
 * Seller payout management dashboard for admins.
 *
 * Follows the exact visual/structural pattern of AdminOrders.jsx.
 * Uses ParticleCanvas, AdminMobileNav, existing dark theme,
 * card styles, modal patterns, and status badge conventions.
 *
 * SECURITY:
 * - No bank account numbers are rendered.
 * - No accounting journal entries are created here.
 * - All payout eligibility decisions come from the backend.
 * - All bank transfers are initiated by the backend only.
 * - No sensitive data stored in localStorage.
 * ======================================================
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "../components/ParticleCanvas";
import AdminMobileNav from "../components/AdminMobileNav";
import {
  getPayouts,
  getEligiblePayouts,
  runPayouts,
  retryPayout,
} from "../services/adminPayoutService";

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  BATCHED: {
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.3)",
    icon: "📦",
    label: "Batched",
  },
  PROCESSING: {
    color: "#c084fc",
    bg: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.3)",
    icon: "⏳",
    label: "Processing",
  },
  PAID: {
    color: "#4ade80",
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.3)",
    icon: "✅",
    label: "Paid",
  },
  FAILED: {
    color: "#f87171",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.3)",
    icon: "❌",
    label: "Failed",
  },
  RETRY_PENDING: {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.15)",
    border: "rgba(251,146,60,0.3)",
    icon: "🔄",
    label: "Retry Pending",
  },
  ELIGIBLE: {
    color: "#facc15",
    bg: "rgba(234,179,8,0.15)",
    border: "rgba(234,179,8,0.3)",
    icon: "⭐",
    label: "Eligible",
  },
  PENDING_ELIGIBILITY: {
    color: "#94a3b8",
    bg: "rgba(71,85,105,0.15)",
    border: "rgba(71,85,105,0.3)",
    icon: "🔍",
    label: "Pending Review",
  },
};

const FILTER_TABS = [
  "ALL",
  "BATCHED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "RETRY_PENDING",
];

// ─── Helper Utilities ─────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  });
}

function formatAmount(amount, currency = "LKR") {
  return `${currency} ${Number(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Mask the middle portion of a payoutId so reference is readable but not full */
function maskPayoutId(id) {
  if (!id) return "—";
  if (id.length <= 16) return id;
  return `${id.substring(0, 10)}…${id.substring(id.length - 6)}`;
}

/** Mask seller/order IDs — only show first 8 chars */
function maskId(id) {
  if (!id) return "—";
  return `${String(id).substring(0, 8)}…`;
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    color: "#94a3b8",
    bg: "rgba(71,85,105,0.1)",
    border: "rgba(71,85,105,0.3)",
    icon: "❓",
    label: status,
  };
  return (
    <span
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black whitespace-nowrap"
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPayouts() {
  const navigate = useNavigate();

  // ── Data state ──
  const [payouts, setPayouts] = useState([]);
  const [eligible, setEligible] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibleLoading, setEligibleLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  // ── UI state ──
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [notification, setNotification] = useState(null); // { type: "success"|"error", msg }

  const adminUser = JSON.parse(
    localStorage.getItem("adminUser") ||
      localStorage.getItem("user") ||
      "{}"
  );

  // ── Show transient notification ──
  const notify = useCallback((type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  // ── Load payout records ──
  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPayouts();
      setPayouts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        navigate("/admin/login");
        return;
      }
      if (err.message === "FORBIDDEN") {
        setError("Access denied. Admin or CEO account required.");
        return;
      }
      setError(err.message || "Failed to load payouts.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ── Load eligible orders ──
  const loadEligible = useCallback(async () => {
    setEligibleLoading(true);
    try {
      const data = await getEligiblePayouts();
      setEligible(Array.isArray(data) ? data : []);
    } catch {
      setEligible([]);
    } finally {
      setEligibleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
    loadEligible();
  }, [loadPayouts, loadEligible]);

  // ── Compute summary statistics from backend data ──
  const summary = {
    eligible: eligible.length,
    eligibleAmount: eligible.reduce((s, e) => s + (e.payableBalance || 0), 0),
    batched: payouts.filter((p) => p.status === "BATCHED").length,
    batchedAmount: payouts
      .filter((p) => p.status === "BATCHED")
      .reduce((s, p) => s + p.amount, 0),
    processing: payouts.filter((p) => p.status === "PROCESSING").length,
    processingAmount: payouts
      .filter((p) => p.status === "PROCESSING")
      .reduce((s, p) => s + p.amount, 0),
    paid: payouts.filter((p) => p.status === "PAID").length,
    paidAmount: payouts
      .filter((p) => p.status === "PAID")
      .reduce((s, p) => s + p.amount, 0),
    failed: payouts.filter((p) => ["FAILED", "RETRY_PENDING"].includes(p.status))
      .length,
    failedAmount: payouts
      .filter((p) => ["FAILED", "RETRY_PENDING"].includes(p.status))
      .reduce((s, p) => s + p.amount, 0),
  };

  // ── Filtered table rows ──
  const visiblePayouts =
    filter === "ALL" ? payouts : payouts.filter((p) => p.status === filter);

  // ── Run all payouts ──
  const handleRunPayouts = async () => {
    setRunLoading(true);
    setRunResult(null);
    try {
      const data = await runPayouts();
      setRunResult({ success: true, data });
      notify("success", `Payout run completed. ${data.results?.length || 0} processed.`);
      await loadPayouts();
      await loadEligible();
    } catch (err) {
      setRunResult({ success: false, error: err.message });
      notify("error", `Run failed: ${err.message}`);
    } finally {
      setRunLoading(false);
    }
  };

  // ── Retry individual payout ──
  const handleRetry = async (payoutId) => {
    setRetryingId(payoutId);
    try {
      await retryPayout(payoutId);
      notify("success", `Retry initiated for ${maskPayoutId(payoutId)}`);
      await loadPayouts();
    } catch (err) {
      notify("error", `Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] text-white font-sans relative overflow-x-hidden">
      <ParticleCanvas />

      {/* Background decoration */}
      <div className="fixed w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-emerald-500/10 blur-[100px] -top-20 -right-20 pointer-events-none z-0" />

      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 relative z-10">
        <style>{`
          @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          .po-card { animation: fadeIn 0.4s ease forwards; transition: transform 0.2s, box-shadow 0.2s; }
          .po-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(52,211,153,0.12); }
        `}</style>

        {/* ── Notification Toast ── */}
        {notification && (
          <div
            className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-xl shadow-xl text-sm font-bold transition-all ${
              notification.type === "success"
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                : "bg-red-500/20 border border-red-500/40 text-red-300"
            }`}
          >
            {notification.type === "success" ? "✅" : "❌"} {notification.msg}
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-10 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                ← Admin Portal
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">💸</span>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-transparent">
                Seller Payouts
              </h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Authenticated as{" "}
              <span className="text-emerald-400 font-bold">
                {adminUser.email || "Admin"}
              </span>
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => { loadPayouts(); loadEligible(); }}
              className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => { setRunModalOpen(true); setRunResult(null); }}
              disabled={loading || eligible.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
            >
              ▶ Process All Eligible ({eligible.length})
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            {
              label: "Eligible",
              count: summary.eligible,
              amount: summary.eligibleAmount,
              icon: "⭐",
              color: "text-yellow-400",
            },
            {
              label: "Batched",
              count: summary.batched,
              amount: summary.batchedAmount,
              icon: "📦",
              color: "text-blue-400",
            },
            {
              label: "Processing",
              count: summary.processing,
              amount: summary.processingAmount,
              icon: "⏳",
              color: "text-purple-400",
            },
            {
              label: "Paid",
              count: summary.paid,
              amount: summary.paidAmount,
              icon: "✅",
              color: "text-emerald-400",
            },
            {
              label: "Failed/Retry",
              count: summary.failed,
              amount: summary.failedAmount,
              icon: "❌",
              color: "text-red-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="po-card bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{s.icon}</span>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                  {s.label}
                </p>
              </div>
              <p className={`text-xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {formatAmount(s.amount)}
              </p>
            </div>
          ))}
        </div>

        {/* ── Eligible Orders Preview ── */}
        {eligible.length > 0 && (
          <div className="mb-6 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
            <p className="text-[11px] font-black uppercase text-yellow-400 tracking-wider mb-3">
              ⭐ Orders Ready for Payout ({eligible.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {eligible.slice(0, 6).map((e, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="text-slate-400">
                      Seller{" "}
                      <span className="text-white font-bold">
                        {maskId(e.order?.sellerId)}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Order {maskId(e.order?.orderId || e.order?._id)}
                    </p>
                  </div>
                  <span className="text-emerald-400 font-black">
                    {formatAmount(e.payableBalance)}
                  </span>
                </div>
              ))}
              {eligible.length > 6 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-center text-xs text-slate-400">
                  +{eligible.length - 6} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Filter Tabs ── */}
        <div className="flex gap-2 flex-wrap mb-5">
          {FILTER_TABS.map((tab) => {
            const count =
              tab === "ALL"
                ? payouts.length
                : payouts.filter((p) => p.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  filter === tab
                    ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-300"
                    : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab === "ALL" ? "All" : STATUS_CONFIG[tab]?.label || tab} ({count})
              </button>
            );
          })}
        </div>

        {/* ── Payout Table ── */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
            Loading payout records...
          </div>
        ) : visiblePayouts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-slate-400 text-sm">
              {filter === "ALL"
                ? "No payout records yet."
                : `No ${filter} payouts.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {[
                    "Payout ID",
                    "Seller",
                    "Orders",
                    "Amount",
                    "Status",
                    "Batched",
                    "Paid",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePayouts.map((payout, i) => (
                  <tr
                    key={payout.payoutId || i}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-slate-400">
                        {maskPayoutId(payout.payoutId)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] text-purple-300">
                        {maskId(payout.sellerId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-white/10 rounded-lg px-2 py-0.5 font-bold">
                        {payout.orderIds?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {formatAmount(payout.amount, payout.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payout.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(payout.batchedAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(payout.paidAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPayout(payout)}
                          className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                        >
                          Details
                        </button>
                        {["FAILED", "RETRY_PENDING"].includes(
                          payout.status
                        ) && (
                          <button
                            onClick={() => handleRetry(payout.payoutId)}
                            disabled={retryingId === payout.payoutId}
                            className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                          >
                            {retryingId === payout.payoutId ? "..." : "Retry"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Payout Details Modal ── */}
      {selectedPayout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">💸</span>
                <div>
                  <h3 className="font-bold text-lg text-white">
                    Payout Details
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {maskPayoutId(selectedPayout.payoutId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayout(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-grow">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 uppercase font-black">
                  Status
                </span>
                <StatusBadge status={selectedPayout.status} />
              </div>

              {/* Amount */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">
                  Payout Amount
                </p>
                <p className="text-2xl font-black text-white">
                  {formatAmount(
                    selectedPayout.amount,
                    selectedPayout.currency
                  )}
                </p>
              </div>

              {/* Info Grid */}
              {[
                { label: "Seller ID", value: maskId(selectedPayout.sellerId) },
                {
                  label: "Orders",
                  value: `${selectedPayout.orderIds?.length || 0} order(s)`,
                },
                { label: "Currency", value: selectedPayout.currency || "LKR" },
                {
                  label: "Batched At",
                  value: formatDate(selectedPayout.batchedAt),
                },
                {
                  label: "Processing At",
                  value: formatDate(selectedPayout.processingAt),
                },
                { label: "Paid At", value: formatDate(selectedPayout.paidAt) },
                {
                  label: "Failed At",
                  value: formatDate(selectedPayout.failedAt),
                },
              ].map(
                ({ label, value }) =>
                  value && value !== "—" && (
                    <div
                      key={label}
                      className="flex items-center justify-between text-xs py-1 border-b border-white/5"
                    >
                      <span className="text-slate-500 uppercase font-black text-[10px]">
                        {label}
                      </span>
                      <span className="text-slate-200 font-mono">{value}</span>
                    </div>
                  )
              )}

              {/* Bank Transfer Reference */}
              {selectedPayout.bankTransferReference && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-400 uppercase font-black mb-1">
                    Bank Transfer Reference
                  </p>
                  <p className="text-xs font-mono text-emerald-300">
                    {selectedPayout.bankTransferReference}
                  </p>
                </div>
              )}

              {/* Failure Reason */}
              {selectedPayout.failureReason && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-red-400 uppercase font-black mb-1">
                    Failure Reason
                  </p>
                  <p className="text-xs text-red-300">
                    {selectedPayout.failureReason}
                  </p>
                </div>
              )}

              {/* Order IDs */}
              {selectedPayout.orderIds?.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-2">
                    Included Orders
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPayout.orderIds.map((id, idx) => (
                      <span
                        key={idx}
                        className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[10px] font-mono text-slate-400"
                      >
                        {maskId(id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-600 pt-2">
                ℹ Accounting entry Dr 2010 / Cr 1010 is created only by the
                backend upon successful bank transfer.
              </p>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-950/50 flex justify-between items-center gap-3">
              {["FAILED", "RETRY_PENDING"].includes(
                selectedPayout.status
              ) && (
                <button
                  onClick={async () => {
                    await handleRetry(selectedPayout.payoutId);
                    setSelectedPayout(null);
                  }}
                  disabled={retryingId === selectedPayout.payoutId}
                  className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-bold hover:bg-orange-500/30 transition-all disabled:opacity-50"
                >
                  {retryingId === selectedPayout.payoutId
                    ? "Retrying..."
                    : "🔄 Retry Payout"}
                </button>
              )}
              <button
                onClick={() => setSelectedPayout(null)}
                className="ml-auto px-5 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Process All Modal ── */}
      {runModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center gap-2.5">
              <span className="text-2xl">▶</span>
              <div>
                <h3 className="font-bold text-lg text-white">
                  Process All Eligible Payouts
                </h3>
                <p className="text-xs text-slate-400">
                  Admin confirmation required
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-emerald-300 font-bold">
                    Eligible Payouts
                  </span>
                  <span className="text-xl font-black text-white">
                    {summary.eligible}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-300 font-bold">
                    Total Amount
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {formatAmount(summary.eligibleAmount)}
                  </span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-slate-800/60 border border-white/10 rounded-xl p-4 space-y-2">
                <p className="text-[11px] text-slate-300 font-bold">
                  Before confirming, understand that:
                </p>
                <ul className="text-[11px] text-slate-400 space-y-1 list-none">
                  <li>
                    ✓ The backend validates each payout's eligibility
                    independently.
                  </li>
                  <li>
                    ✓ Bank transfers are initiated and managed by the backend.
                  </li>
                  <li>
                    ✓ Accounting entry{" "}
                    <span className="text-white font-mono text-[10px]">
                      Dr 2010 / Cr 1010
                    </span>{" "}
                    is created only after a successful bank transfer.
                  </li>
                  <li>
                    ✓ The frontend does NOT create accounting entries.
                  </li>
                  <li>
                    ✓ Failed transfers are marked{" "}
                    <span className="text-orange-300 font-bold">
                      RETRY_PENDING
                    </span>{" "}
                    and do not affect accounting.
                  </li>
                  <li>
                    ✓ This action is idempotent — re-running cannot
                    double-pay.
                  </li>
                </ul>
              </div>

              {/* Results */}
              {runResult && (
                <div
                  className={`rounded-xl p-3 text-xs border ${
                    runResult.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border-red-500/20 text-red-300"
                  }`}
                >
                  {runResult.success ? (
                    <>
                      <p className="font-bold mb-1">
                        ✅ {runResult.data?.message}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {runResult.data?.results?.length || 0} records
                        processed.
                      </p>
                    </>
                  ) : (
                    <p className="font-bold">❌ {runResult.error}</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-950/50 flex gap-3 justify-end">
              <button
                onClick={() => setRunModalOpen(false)}
                disabled={runLoading}
                className="px-5 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              {!runResult?.success && (
                <button
                  onClick={handleRunPayouts}
                  disabled={runLoading || eligible.length === 0}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  {runLoading
                    ? "Processing..."
                    : `Confirm & Process ${summary.eligible} Payouts`}
                </button>
              )}
              {runResult?.success && (
                <button
                  onClick={() => setRunModalOpen(false)}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AdminMobileNav />
    </div>
  );
}
