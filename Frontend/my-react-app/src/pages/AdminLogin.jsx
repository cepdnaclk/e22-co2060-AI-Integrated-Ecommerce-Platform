import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

/**
 * ======================================================
 * ADMIN LOGIN PAGE
 * Separate login portal for admin users only
 * Regular users cannot access admin features from here
 * ======================================================
 */

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  // Check if already logged in as admin
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem("adminToken");
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            navigate("/admin/dashboard");
            return;
          }
        } catch {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
        }
      }
      setCheckingAuth(false);
    };
    checkExistingAuth();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store admin token separately from regular user token
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      
      // Also set as regular token for API calls
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/admin/dashboard");

    } catch (err) {
      console.error("Admin login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={styles.page}>
        <div style={styles.loader}>Verifying session...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Background decoration */}
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />
      
      <div style={styles.container}>
        {/* Left Panel - Branding */}
        <div style={styles.leftPanel}>
          <div style={styles.brandContent}>
            <div style={styles.shieldIcon}>🛡️</div>
            <h1 style={styles.brandTitle}>Admin Portal</h1>
            <p style={styles.brandSubtitle}>
              Secure access to inventory management, analytics, and system controls.
            </p>
            <div style={styles.features}>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>📊</span>
                <span>Inventory Management</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>📦</span>
                <span>Product Catalog Control</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>👥</span>
                <span>User Administration</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>📈</span>
                <span>Platform Analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div style={styles.rightPanel}>
          <div style={styles.formContainer}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Admin Sign In</h2>
              <p style={styles.formSubtitle}>
                Enter your admin credentials to continue
              </p>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <span style={styles.errorIcon}>⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  placeholder="admin@company.com"
                  style={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    style={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer"
                }}
                disabled={loading}
              >
                {loading ? (
                  <span style={styles.loadingText}>
                    <span style={styles.spinner}>⏳</span> Authenticating...
                  </span>
                ) : (
                  "Sign In to Admin Portal"
                )}
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>Admin Access Only</span>
              <span style={styles.dividerLine} />
            </div>

            <p style={styles.notice}>
              🔒 This portal is restricted to authorized administrators only.
              Regular users should use the <a href="/login" style={styles.link}>main login</a>.
            </p>

            <button
              onClick={() => navigate("/")}
              style={styles.backButton}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Segoe UI', system-ui, sans-serif"
  },
  bgCircle1: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
    top: -200,
    right: -200,
    pointerEvents: "none"
  },
  bgCircle2: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
    bottom: -100,
    left: -100,
    pointerEvents: "none"
  },
  loader: {
    color: "#94a3b8",
    fontSize: 18
  },
  container: {
    display: "flex",
    width: "100%",
    maxWidth: 1000,
    minHeight: 600,
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(20px)",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.1)",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
  },
  leftPanel: {
    flex: 1,
    background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(59,130,246,0.2) 100%)",
    padding: 48,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderRight: "1px solid rgba(255,255,255,0.05)"
  },
  brandContent: {
    color: "#fff"
  },
  shieldIcon: {
    fontSize: 56,
    marginBottom: 24
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 16,
    background: "linear-gradient(to right, #fff, #c084fc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  brandSubtitle: {
    fontSize: 16,
    color: "#cbd5e1",
    lineHeight: 1.6,
    marginBottom: 32
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 15,
    color: "#e2e8f0"
  },
  featureIcon: {
    fontSize: 20
  },
  rightPanel: {
    flex: 1,
    padding: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.5)"
  },
  formContainer: {
    width: "100%",
    maxWidth: 360
  },
  formHeader: {
    marginBottom: 32,
    textAlign: "center"
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 8
  },
  formSubtitle: {
    fontSize: 14,
    color: "#94a3b8"
  },
  errorBox: {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 24,
    color: "#fca5a5",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  errorIcon: {
    fontSize: 16
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#e2e8f0"
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box"
  },
  passwordWrapper: {
    position: "relative"
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    padding: 4
  },
  submitButton: {
    width: "100%",
    padding: "16px 24px",
    fontSize: 16,
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    marginTop: 8,
    transition: "transform 0.2s, box-shadow 0.2s"
  },
  loadingText: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  spinner: {
    animation: "spin 1s linear infinite"
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "24px 0"
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,0.1)"
  },
  dividerText: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  notice: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 1.6
  },
  link: {
    color: "#a855f7",
    textDecoration: "none"
  },
  backButton: {
    width: "100%",
    padding: "12px 24px",
    fontSize: 14,
    color: "#94a3b8",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    cursor: "pointer",
    marginTop: 16,
    transition: "background 0.2s, color 0.2s"
  }
};
