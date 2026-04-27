import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminDmsService } from "../services/adminDmsService";

function badgeStyle(status = "") {
  const normalized = `${status}`.toLowerCase();
  if (["approved", "active", "operational", "idle", "assigned"].includes(normalized)) {
    return { background: "rgba(34,197,94,0.16)", color: "#86efac", border: "1px solid rgba(34,197,94,0.35)" };
  }
  if (["pending", "pending_verification"].includes(normalized)) {
    return { background: "rgba(245,158,11,0.16)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.35)" };
  }
  if (["disabled", "suspended"].includes(normalized)) {
    return { background: "rgba(239,68,68,0.16)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" };
  }
  return { background: "rgba(148,163,184,0.16)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.35)" };
}

function formatLocation(location = {}) {
  if (location.source === "tracking_event") {
    return `${location.lat}, ${location.lng}`;
  }
  return [location.city, location.district].filter(Boolean).join(", ") || "N/A";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusMatchesFilter(center, filter) {
  if (filter === "all") return true;
  if (filter === "approved") return center.centerStatus === "approved";
  if (filter === "pending") return center.centerStatus === "pending";
  if (filter === "disabled") return center.centerStatus === "disabled";
  return true;
}

export default function AdminDmsControlTower() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState({ totals: null, centers: [] });
  const [search, setSearch] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [expandedCenterId, setExpandedCenterId] = useState(null);
  const [busyAction, setBusyAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminDmsService.getControlTower({
        maxOrdersPerCenter: 20,
        maxOrdersPerRider: 5,
      });
      setPayload({
        totals: data?.totals || null,
        centers: data?.centers || [],
      });
      setExpandedCenterId((prev) => prev || (data?.centers?.[0]?.branchId || null));
    } catch (err) {
      setError(err.message || "Failed to load center control tower");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCenters = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (payload.centers || []).filter((center) => {
      if (!statusMatchesFilter(center, centerFilter)) return false;
      if (!keyword) return true;
      return [
        center.centerName,
        center.centerCode,
        center.city,
        center.district,
        center.company?.companyName,
        center.company?.registrationNumber,
      ]
        .filter(Boolean)
        .some((text) => `${text}`.toLowerCase().includes(keyword));
    });
  }, [payload.centers, search, centerFilter]);

  const performAction = useCallback(
    async (actionKey, fn) => {
      setBusyAction(actionKey);
      setError("");
      try {
        await fn();
        await load();
      } catch (err) {
        setError(err.message || "Action failed");
      } finally {
        setBusyAction("");
      }
    },
    [load]
  );

  const totals = payload.totals || {
    centers: 0,
    approvedCenters: 0,
    pendingCenters: 0,
    disabledCenters: 0,
    riders: 0,
    activeRiders: 0,
    pendingRiders: 0,
    suspendedRiders: 0,
    activeShipments: 0,
    outForDelivery: 0,
    delayedShipments: 0,
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>DMS Control Tower</h1>
            <p style={S.subtitle}>
              Full admin visibility for delivery centers, riders, live operational status, and shipment control.
            </p>
          </div>
          <div style={S.headerActions}>
            <button style={S.btnGhost} onClick={() => navigate("/admin/dashboard")}>Back</button>
            <button style={S.btnPrimary} onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {error && <div style={S.error}>{error}</div>}

        <div style={S.metrics}>
          <Metric label="Centers" value={totals.centers} />
          <Metric label="Approved / Pending / Disabled" value={`${totals.approvedCenters} / ${totals.pendingCenters} / ${totals.disabledCenters}`} />
          <Metric label="Riders (Active/Pending/Suspended)" value={`${totals.activeRiders} / ${totals.pendingRiders} / ${totals.suspendedRiders}`} />
          <Metric label="Shipments Active" value={totals.activeShipments} />
          <Metric label="Out For Delivery" value={totals.outForDelivery} />
          <Metric label="Delayed Shipments" value={totals.delayedShipments} />
        </div>

        <div style={S.filters}>
          <input
            style={S.input}
            placeholder="Search center by name, code, city, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            style={S.select}
            value={centerFilter}
            onChange={(e) => setCenterFilter(e.target.value)}
          >
            <option value="all">All Centers</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div style={S.centerList}>
          {filteredCenters.map((center) => {
            const centerKey = `${center.branchId}`;
            const expanded = expandedCenterId === centerKey;
            const centerBusy = busyAction.startsWith(`center:${centerKey}:`);

            return (
              <div key={centerKey} style={S.centerCard}>
                <div style={S.centerHead}>
                  <div>
                    <div style={S.centerName}>{center.centerName} ({center.centerCode})</div>
                    <div style={S.centerMeta}>
                      {center.city}, {center.district} • {center.company?.companyName || "No company"} • {center.company?.registrationNumber || "-"}
                    </div>
                  </div>

                  <div style={S.centerHeadRight}>
                    <span style={{ ...S.badge, ...badgeStyle(center.operationalState) }}>{center.operationalState}</span>
                    <span style={{ ...S.badge, ...badgeStyle(center.centerStatus) }}>center:{center.centerStatus}</span>
                    <span style={{ ...S.badge, ...badgeStyle(center.company?.status) }}>company:{center.company?.status || "unknown"}</span>
                    <button
                      style={S.btnSmall}
                      onClick={() => setExpandedCenterId(expanded ? null : centerKey)}
                    >
                      {expanded ? "Collapse" : "Expand"}
                    </button>
                    <button
                      style={S.btnSuccess}
                      disabled={centerBusy}
                      onClick={() =>
                        performAction(`center:${centerKey}:verify`, () =>
                          adminDmsService.verifyCenter(center.branchId, { remarks: "Verified by admin control tower" })
                        )
                      }
                    >
                      Verify Center
                    </button>
                    <button
                      style={S.btnDanger}
                      disabled={centerBusy}
                      onClick={() =>
                        performAction(`center:${centerKey}:suspend`, () =>
                          adminDmsService.suspendCenter(center.branchId, { remarks: "Suspended by admin control tower" })
                        )
                      }
                    >
                      Suspend Center
                    </button>
                  </div>
                </div>

                <div style={S.summaryGrid}>
                  <MiniStat label="Manager" value={center.manager?.fullName || "N/A"} />
                  <MiniStat label="Riders" value={center.riderSummary?.total || 0} />
                  <MiniStat label="Active Riders" value={center.riderSummary?.active || 0} />
                  <MiniStat label="Active Orders" value={center.orderSummary?.active || 0} />
                  <MiniStat label="Out For Delivery" value={center.orderSummary?.outForDelivery || 0} />
                  <MiniStat label="Delayed" value={center.orderSummary?.delayed || 0} />
                </div>

                {expanded && (
                  <div style={S.centerBody}>
                    <h3 style={S.sectionTitle}>Center Active Orders</h3>
                    <div style={S.orderList}>
                      {center.activeOrders?.map((order) => (
                        <div key={order.id} style={S.orderItem}>
                          <div style={{ fontWeight: 700 }}>{order.trackingNumber}</div>
                          <div style={S.orderMeta}>
                            {order.status} • last scan: {order.lastScan || "-"} • updated: {formatDate(order.updatedAt)}
                          </div>
                          <div style={S.orderMeta}>
                            Destination: {order.destination?.city || "-"}, {order.destination?.district || "-"}
                          </div>
                        </div>
                      ))}
                      {(!center.activeOrders || center.activeOrders.length === 0) && (
                        <div style={S.empty}>No active orders in this center</div>
                      )}
                    </div>

                    <h3 style={S.sectionTitle}>Riders</h3>
                    <div style={S.riderTableWrap}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>Rider</th>
                            <th style={S.th}>Status</th>
                            <th style={S.th}>Where now</th>
                            <th style={S.th}>Workload</th>
                            <th style={S.th}>Orders</th>
                            <th style={S.th}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(center.riders || []).map((rider) => {
                            const riderBusy = busyAction.startsWith(`rider:${rider.id}:`);
                            return (
                              <tr key={rider.id}>
                                <td style={S.td}>
                                  <div style={{ fontWeight: 700 }}>{rider.fullName}</div>
                                  <div style={S.tdSub}>{rider.employeeId} • {rider.email || "No email"}</div>
                                </td>
                                <td style={S.td}>
                                  <span style={{ ...S.badge, ...badgeStyle(rider.status) }}>{rider.status}</span>
                                  <span style={{ ...S.badge, ...badgeStyle(rider.currentStatus), marginLeft: 6 }}>{rider.currentStatus}</span>
                                </td>
                                <td style={S.td}>
                                  <div>{formatLocation(rider.currentLocation)}</div>
                                  <div style={S.tdSub}>Last scan: {formatDate(rider.lastTrackingEvent?.occurredAt)}</div>
                                </td>
                                <td style={S.td}>
                                  <div>Assignments: {rider.workload?.activeAssignments || 0}</div>
                                  <div style={S.tdSub}>Queue: {rider.workload?.earliestQueuePosition || 0}</div>
                                </td>
                                <td style={S.td}>
                                  {(rider.activeOrders || []).slice(0, 3).map((order) => (
                                    <div key={order.id} style={S.tdSub}>{order.trackingNumber} ({order.status})</div>
                                  ))}
                                  {(!rider.activeOrders || rider.activeOrders.length === 0) && (
                                    <div style={S.tdSub}>No active orders</div>
                                  )}
                                </td>
                                <td style={S.td}>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <button
                                      style={S.btnVerify}
                                      disabled={riderBusy}
                                      onClick={() =>
                                        performAction(`rider:${rider.id}:verify`, () =>
                                          adminDmsService.verifyRider(rider.id, { idVerified: true })
                                        )
                                      }
                                    >
                                      Verify
                                    </button>
                                    <button
                                      style={S.btnSuspend}
                                      disabled={riderBusy}
                                      onClick={() =>
                                        performAction(`rider:${rider.id}:suspend`, () =>
                                          adminDmsService.suspendRider(rider.id, { reason: "Suspended by admin control tower" })
                                        )
                                      }
                                    >
                                      Suspend
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredCenters.length === 0 && <div style={S.empty}>No centers match the current filter.</div>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={S.metricCard}>
      <div style={S.metricValue}>{value}</div>
      <div style={S.metricLabel}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={S.miniStat}>
      <div style={S.miniLabel}>{label}</div>
      <div style={S.miniValue}>{value}</div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    padding: "28px 20px",
  },
  container: { maxWidth: 1420, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  title: { margin: 0, fontSize: 30, fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#94a3b8", fontSize: 14, maxWidth: 780 },
  headerActions: { display: "flex", gap: 8 },
  error: { background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5", padding: "10px 12px", borderRadius: 10, marginBottom: 12 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 },
  metricCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "12px 14px" },
  metricValue: { fontSize: 22, fontWeight: 800, color: "#c084fc" },
  metricLabel: { marginTop: 4, fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  filters: { display: "grid", gridTemplateColumns: "1fr 180px", gap: 10, marginBottom: 14 },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#fff", fontSize: 14 },
  select: { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#fff", fontSize: 14 },
  centerList: { display: "flex", flexDirection: "column", gap: 12 },
  centerCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 },
  centerHead: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  centerName: { fontSize: 18, fontWeight: 800 },
  centerMeta: { marginTop: 4, color: "#94a3b8", fontSize: 13 },
  centerHeadRight: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "flex-end" },
  badge: { fontSize: 11, borderRadius: 999, padding: "4px 8px", fontWeight: 700 },
  summaryGrid: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 },
  miniStat: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px" },
  miniLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" },
  miniValue: { fontSize: 14, fontWeight: 700, color: "#e2e8f0" },
  centerBody: { marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12 },
  sectionTitle: { margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#cbd5e1" },
  orderList: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8, marginBottom: 12 },
  orderItem: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px" },
  orderMeta: { marginTop: 4, fontSize: 12, color: "#94a3b8" },
  riderTableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" },
  td: { padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", verticalAlign: "top", fontSize: 13, color: "#e2e8f0" },
  tdSub: { color: "#94a3b8", fontSize: 12, marginTop: 3 },
  btnPrimary: { background: "linear-gradient(to right, #7e22ce, #a855f7)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 12px", fontWeight: 700, cursor: "pointer", fontSize: 13 },
  btnGhost: { background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "9px 12px", fontWeight: 700, cursor: "pointer", fontSize: 13 },
  btnSmall: { background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, padding: "6px 9px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  btnSuccess: { background: "rgba(34,197,94,0.14)", color: "#86efac", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 8, padding: "6px 9px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  btnDanger: { background: "rgba(239,68,68,0.14)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, padding: "6px 9px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  btnVerify: { background: "rgba(34,197,94,0.14)", color: "#86efac", border: "1px solid rgba(34,197,94,0.35)", borderRadius: 8, padding: "5px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  btnSuspend: { background: "rgba(239,68,68,0.14)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, padding: "5px 8px", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  empty: { color: "#64748b", fontSize: 13, padding: "10px 0" },
};
