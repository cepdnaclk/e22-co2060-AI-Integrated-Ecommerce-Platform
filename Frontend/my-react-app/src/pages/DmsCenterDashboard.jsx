import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dmsService } from "../services/dmsService";

const RIDER_FORM_INITIAL = {
  fullName: "",
  email: "",
  phone: "",
  employeeId: "",
  password: "",
  confirmPassword: "",
};

export default function DmsCenterDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState({});
  const [shipments, setShipments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [riders, setRiders] = useState([]);
  const [riderForm, setRiderForm] = useState(RIDER_FORM_INITIAL);
  const [riderSubmitting, setRiderSubmitting] = useState(false);
  const [riderError, setRiderError] = useState("");
  const [riderSuccess, setRiderSuccess] = useState("");

  const isRider = useMemo(
    () => profile?.staff?.role === "delivery_rider",
    [profile?.staff?.role]
  );
  const canManageRiders = useMemo(
    () => ["branch_manager", "dispatch_operator"].includes(profile?.staff?.role || ""),
    [profile?.staff?.role]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const portal = await dmsService.getPortalProfile();
      setProfile(portal);

      const branchId = portal?.branch?.id || portal?.actor?.branchId;
      if (!branchId) {
        throw new Error("Branch center is not linked to this account");
      }

      const canViewRiders = ["branch_manager", "dispatch_operator"].includes(portal?.staff?.role || "");
      const ridersRequest = canViewRiders
        ? dmsService.getStaff({ assignedBranchId: branchId, role: "delivery_rider" })
        : Promise.resolve({ staff: [] });

      const [dashboardRes, shipmentsRes, queueRes, ridersRes] = await Promise.all([
        dmsService.getCenterDashboard(),
        dmsService.getCenterShipments({ view: "active" }),
        dmsService.getCenterRiderQueue(),
        ridersRequest,
      ]);

      setDashboard(dashboardRes?.dashboard || {});
      setShipments(shipmentsRes?.shipments || []);
      setQueue(queueRes?.assignments || []);
      setRiders(ridersRes?.staff || []);
    } catch (err) {
      setError(err.message || "Failed to load center dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = () => {
    dmsService.clearPortalSession();
    navigate("/dms/login");
  };

  const handleRiderInputChange = (field) => (event) => {
    setRiderForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRiderRegister = async (event) => {
    event.preventDefault();
    setRiderError("");
    setRiderSuccess("");

    const courierCompanyId = profile?.courierCompany?.id || profile?.actor?.courierCompanyId;
    const assignedBranchId = profile?.branch?.id || profile?.actor?.branchId;
    if (!courierCompanyId || !assignedBranchId) {
      setRiderError("Cannot resolve center details for rider registration");
      return;
    }
    if (riderForm.password !== riderForm.confirmPassword) {
      setRiderError("Password confirmation does not match");
      return;
    }

    setRiderSubmitting(true);
    try {
      await dmsService.registerStaff({
        courierCompanyId,
        assignedBranchId,
        role: "delivery_rider",
        fullName: riderForm.fullName,
        email: riderForm.email,
        phone: riderForm.phone,
        employeeId: riderForm.employeeId || undefined,
        password: riderForm.password,
      });
      setRiderSuccess("Rider account registered. Rider can now log in from DMS sign in.");
      setRiderForm(RIDER_FORM_INITIAL);
      await load();
    } catch (err) {
      setRiderError(err.message || "Failed to register rider");
    } finally {
      setRiderSubmitting(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Delivery Center Dashboard</h1>
            <p style={S.subtitle}>
              {profile?.branch?.branchName || "Center"} • {profile?.staff?.fullName || ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.btnGhost} onClick={load} disabled={loading}>Refresh</button>
            <button style={S.btnDanger} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {error && <div style={S.error}>{error}</div>}
        {loading && <div style={S.info}>Loading center analytics...</div>}

        <div style={S.metrics}>
          <Metric label="Shipments Handled" value={dashboard?.shipmentsHandled || 0} />
          <Metric label="Delivered" value={dashboard?.delivered || 0} />
          <Metric label="Failed" value={dashboard?.failed || 0} />
          <Metric label="Delayed" value={dashboard?.delayed || 0} />
          <Metric label="Inventory In Branch" value={dashboard?.branchInventory || 0} />
          <Metric label="On-Time Performance" value={`${dashboard?.onTimePerformance || 0}%`} />
        </div>

        <div style={S.twoCol}>
          <div style={S.card}>
            <h2 style={S.cardTitle}>Center Shipment Queue</h2>
            <div style={S.list}>
              {shipments.slice(0, 12).map((item) => (
                <div key={item._id} style={S.listItem}>
                  <div style={{ fontWeight: 700 }}>{item.trackingNumber}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.status}</div>
                </div>
              ))}
              {shipments.length === 0 && <div style={S.empty}>No active center shipments</div>}
            </div>
          </div>

          <div style={S.card}>
            <h2 style={S.cardTitle}>{isRider ? "My Rider Queue" : "Rider Assignment Queue"}</h2>
            <div style={S.list}>
              {queue.slice(0, 12).map((item) => (
                <div key={item._id} style={S.listItem}>
                  <div style={{ fontWeight: 700 }}>{item.deliveryOrderId}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    Position #{item.queuePosition || 0} • {item.status}
                  </div>
                </div>
              ))}
              {queue.length === 0 && <div style={S.empty}>No active rider assignments</div>}
            </div>
          </div>
        </div>

        {canManageRiders && (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Register Rider Accounts</h2>
            <p style={S.cardSubTitle}>
              Add riders under this center. Registered riders can sign in through the DMS login page.
            </p>
            {riderError && <div style={S.error}>{riderError}</div>}
            {riderSuccess && <div style={S.success}>{riderSuccess}</div>}
            <form style={S.formGrid} onSubmit={handleRiderRegister}>
              <input
                style={S.input}
                placeholder="Rider full name"
                value={riderForm.fullName}
                onChange={handleRiderInputChange("fullName")}
                required
              />
              <input
                style={S.input}
                placeholder="Rider email"
                type="email"
                value={riderForm.email}
                onChange={handleRiderInputChange("email")}
                required
              />
              <input
                style={S.input}
                placeholder="Phone (optional)"
                value={riderForm.phone}
                onChange={handleRiderInputChange("phone")}
              />
              <input
                style={S.input}
                placeholder="Employee ID (optional)"
                value={riderForm.employeeId}
                onChange={handleRiderInputChange("employeeId")}
              />
              <input
                style={S.input}
                placeholder="Temporary password"
                type="password"
                value={riderForm.password}
                onChange={handleRiderInputChange("password")}
                required
              />
              <input
                style={S.input}
                placeholder="Confirm password"
                type="password"
                value={riderForm.confirmPassword}
                onChange={handleRiderInputChange("confirmPassword")}
                required
              />
              <button style={S.btnPrimary} type="submit" disabled={riderSubmitting}>
                {riderSubmitting ? "Registering rider..." : "Register Rider"}
              </button>
            </form>

            <div style={{ marginTop: 14 }}>
              <h3 style={S.listTitle}>Center Riders</h3>
              <div style={S.list}>
                {riders.map((rider) => (
                  <div key={rider._id} style={S.listItem}>
                    <div style={{ fontWeight: 700 }}>{rider.fullName}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {rider.employeeId} • {rider.email || "No email"} • {rider.status}
                    </div>
                  </div>
                ))}
                {riders.length === 0 && <div style={S.empty}>No riders registered in this center</div>}
              </div>
            </div>
          </div>
        )}
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

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    padding: "30px 20px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  container: { maxWidth: 1300, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  title: { margin: 0, fontSize: 30, fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#94a3b8", fontSize: 14 },
  error: { background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 },
  success: { background: "rgba(34,197,94,0.12)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 },
  info: { color: "#94a3b8", marginBottom: 12, fontSize: 13 },
  btnGhost: { background: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 },
  btnDanger: { background: "rgba(239,68,68,0.14)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 },
  btnPrimary: { width: "fit-content", background: "linear-gradient(to right, #7e22ce, #a855f7)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 16 },
  metricCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px" },
  metricValue: { fontSize: 24, fontWeight: 800, color: "#c084fc" },
  metricLabel: { marginTop: 4, fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 },
  cardTitle: { margin: "0 0 10px", fontSize: 16, fontWeight: 700 },
  cardSubTitle: { margin: "0 0 12px", color: "#94a3b8", fontSize: 13 },
  listTitle: { margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#cbd5e1" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, alignItems: "center" },
  input: { width: "100%", background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "10px 12px", fontSize: 13, boxSizing: "border-box" },
  list: { display: "flex", flexDirection: "column", gap: 8, minHeight: 120 },
  listItem: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px" },
  empty: { color: "#64748b", fontSize: 13, marginTop: 8 },
};

