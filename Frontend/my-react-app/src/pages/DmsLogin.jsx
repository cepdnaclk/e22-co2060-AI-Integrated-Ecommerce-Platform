import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { dmsService } from "../services/dmsService";

export default function DmsLogin() {
  const location = useLocation();
  const registrationSuccess = Boolean(location.state?.registrationSuccess);
  const [email, setEmail] = useState(location.state?.prefillEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyExistingSession = async () => {
      const token = localStorage.getItem("dms_token");
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        const profile = await dmsService.getPortalProfile();
        navigate(location.state?.from?.pathname || profile.dashboardRoute || "/dms/center/dashboard", { replace: true });
      } catch {
        localStorage.removeItem("dmsPortalUser");
        setChecking(false);
      }
    };

    verifyExistingSession();
  }, [location.state?.from?.pathname, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await dmsService.loginWithPassword({ email, password });
      const profile = await dmsService.getPortalProfile();
      navigate(location.state?.from?.pathname || profile.dashboardRoute || "/dms/center/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-sans">
        Checking existing delivery session...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] text-white font-sans overflow-x-hidden">
      {/* Left Branding Panel */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 py-16 md:px-16 md:py-24">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
          Delivery Partner Portal
        </h1>
        <p className="text-slate-300 text-lg md:text-xl max-w-lg leading-relaxed">
          Login for delivery center staff. Access branch operations, shipment workflow, scanning queue, and center performance.
        </p>
        <div className="mt-8 flex gap-4 opacity-50 text-sm font-bold uppercase tracking-widest">
          <span>Speed</span>
          <span>•</span>
          <span>Safety</span>
          <span>•</span>
          <span>Scale</span>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <form 
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-md shadow-2xl" 
          onSubmit={handleSubmit}
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">DMS Sign In</h2>
            <p className="text-slate-400 text-sm">Use your delivery center account credentials.</p>
          </div>

          {registrationSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-sm mb-6">
              Registration complete. You can now sign in.
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm mb-6">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-white placeholder:text-slate-600"
                placeholder="courier.user@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Secure Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-white placeholder:text-slate-600"
                  placeholder="Enter password"
                  required
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 font-bold text-xs"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? "SIGNING IN..." : "SIGN IN TO PORTAL"}
            </button>

            <div className="pt-4 space-y-4">
              <Link 
                to="/dms/register" 
                className="block w-full text-center border border-white/10 hover:bg-white/5 text-slate-300 font-bold py-3 rounded-xl transition-all"
              >
                Register New Delivery Center
              </Link>
              <p className="text-center text-xs text-slate-500">
                Need account activation? <span className="text-purple-400 cursor-pointer">Contact platform admin</span>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
