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
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Delivery Center Dashboard</h1>
            <p className="text-slate-400 mt-1">
              {profile?.branch?.branchName || "Center"} • {profile?.staff?.fullName || "Staff"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button 
              className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20 active:scale-95 disabled:opacity-50"
              onClick={() => navigate("/dms/center/scan")} 
              disabled={loading}
            >
              Scan Seller QR
            </button>
            <button 
              className="px-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
              onClick={load} 
              disabled={loading}
            >
              Refresh
            </button>
            <button 
              className="px-6 py-3 rounded-xl font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm font-medium">{error}</div>}
        {loading && <div className="text-slate-500 text-sm animate-pulse">Loading center analytics...</div>}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Metric label="Handled" value={dashboard?.shipmentsHandled || 0} />
          <Metric label="Delivered" value={dashboard?.delivered || 0} />
          <Metric label="Failed" value={dashboard?.failed || 0} />
          <Metric label="Delayed" value={dashboard?.delayed || 0} />
          <Metric label="Inventory" value={dashboard?.branchInventory || 0} />
          <Metric label="Performance" value={`${dashboard?.onTimePerformance || 0}%`} color="text-emerald-400" />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shipment Queue */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Center Shipment Queue
            </h2>
            <div className="space-y-3">
              {shipments.slice(0, 10).map((item) => (
                <div key={item._id} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="font-bold">{item.trackingNumber}</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">{item.status}</div>
                </div>
              ))}
              {shipments.length === 0 && <div className="text-slate-600 text-sm py-8 text-center italic">No active center shipments</div>}
            </div>
          </div>

          {/* Rider Queue */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {isRider ? "My Rider Queue" : "Rider Assignment Queue"}
            </h2>
            <div className="space-y-3">
              {queue.slice(0, 10).map((item) => (
                <div key={item._id} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="font-bold">{item.deliveryOrderId}</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
                    Position #{item.queuePosition || 0} • {item.status}
                  </div>
                </div>
              ))}
              {queue.length === 0 && <div className="text-slate-600 text-sm py-8 text-center italic">No active rider assignments</div>}
            </div>
          </div>
        </div>

        {/* Rider Management */}
        {canManageRiders && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Register Rider Accounts</h2>
              <p className="text-slate-400 text-sm mt-1">Add new riders to this center. They can then sign in via the portal.</p>
            </div>

            {riderError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm mb-4">{riderError}</div>}
            {riderSuccess && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-sm mb-4">{riderSuccess}</div>}

            <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" onSubmit={handleRiderRegister}>
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Full Name" value={riderForm.fullName} onChange={handleRiderInputChange("fullName")} required />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Email Address" type="email" value={riderForm.email} onChange={handleRiderInputChange("email")} required />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Phone Number" value={riderForm.phone} onChange={handleRiderInputChange("phone")} />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Employee ID" value={riderForm.employeeId} onChange={handleRiderInputChange("employeeId")} />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Password" type="password" value={riderForm.password} onChange={handleRiderInputChange("password")} required />
              <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="Confirm Password" type="password" value={riderForm.confirmPassword} onChange={handleRiderInputChange("confirmPassword")} required />
              <button className="md:col-span-2 lg:col-span-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all" type="submit" disabled={riderSubmitting}>
                {riderSubmitting ? "Registering..." : "Register Rider"}
              </button>
            </form>

            <div className="mt-10">
              <h3 className="text-lg font-bold mb-4 text-slate-300">Registered Center Riders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {riders.map((rider) => (
                  <div key={rider._id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="font-bold">{rider.fullName}</div>
                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-tight truncate">
                      {rider.employeeId || "No ID"} • {rider.email}
                    </div>
                    <div className="mt-2 inline-block px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold uppercase">
                      {rider.status}
                    </div>
                  </div>
                ))}
                {riders.length === 0 && <div className="text-slate-600 text-sm py-4 italic">No riders registered yet</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color = "text-purple-400" }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</div>
    </div>
  );
}
