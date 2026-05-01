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
      const token = localStorage.getItem("token");
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
      <div style={S.page}>
        <div style={S.panel}>Checking existing delivery session...</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.leftPanel}>
        <h1 style={S.brandTitle}>Delivery Partner Portal</h1>
        <p style={S.brandText}>
          Login for delivery center staff. Access branch operations, shipment workflow, scanning queue, and center performance.
        </p>
      </div>

      <div style={S.rightPanel}>
        <form style={S.form} onSubmit={handleSubmit}>
          <h2 style={S.formTitle}>DMS Sign In</h2>
          <p style={S.formSub}>Use your delivery center account credentials.</p>

          {registrationSuccess && (
            <div style={S.success}>Registration complete. You can now sign in.</div>
          )}
          {error && <div style={S.error}>{error}</div>}

          <label style={S.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={S.input}
            placeholder="courier.user@company.com"
            required
          />

          <label style={S.label}>Password</label>
          <div style={S.passwordWrap}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...S.input, marginBottom: 0 }}
              placeholder="Enter password"
              required
            />
            <button type="button" style={S.showBtn} onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button type="submit" style={S.loginBtn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <Link to="/dms/register" style={S.secondaryBtn}>
            Register New Delivery Center
          </Link>

          <span style={S.helpLink}>
            Need account activation? Contact platform admin.
          </span>
        </form>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  panel: {
    margin: "auto",
    color: "#94a3b8",
  },
  leftPanel: {
    padding: "72px 56px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  brandTitle: {
    margin: 0,
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1.2,
  },
  brandText: {
    marginTop: 18,
    color: "#cbd5e1",
    fontSize: 16,
    maxWidth: 520,
    lineHeight: 1.6,
  },
  rightPanel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  form: {
    width: "100%",
    maxWidth: 430,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "28px 24px",
  },
  formTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
  },
  formSub: {
    marginTop: 6,
    marginBottom: 18,
    color: "#94a3b8",
    fontSize: 13,
  },
  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 10,
    color: "#fca5a5",
    fontSize: 13,
    padding: "10px 12px",
    marginBottom: 12,
  },
  success: {
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.3)",
    borderRadius: 10,
    color: "#86efac",
    fontSize: 13,
    padding: "10px 12px",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    marginBottom: 14,
    padding: "11px 12px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    boxSizing: "border-box",
    outline: "none",
  },
  passwordWrap: {
    position: "relative",
    marginBottom: 14,
  },
  showBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    background: "none",
    border: "none",
    color: "#93c5fd",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 700,
    padding: "4px 6px",
  },
  loginBtn: {
    width: "100%",
    padding: "11px 12px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    color: "#fff",
    fontWeight: 800,
    background: "linear-gradient(to right, #7e22ce, #a855f7)",
    fontSize: 14,
    marginBottom: 10,
  },
  secondaryBtn: {
    width: "100%",
    display: "inline-block",
    textAlign: "center",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#cbd5e1",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.02)",
  },
  helpLink: {
    display: "inline-block",
    marginTop: 12,
    color: "#93c5fd",
    textDecoration: "none",
    fontSize: 12,
  },
};

