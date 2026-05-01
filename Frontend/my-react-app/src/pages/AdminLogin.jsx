import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

/**
 * ======================================================
 * ADMIN LOGIN PAGE
 * Separate login portal for admin users only.
 * Supports optional Face Recognition as a second factor
 * when FACE_RECOGNITION_ENABLED=true on the server.
 * ======================================================
 */

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Face verification state
  const [faceStep, setFaceStep] = useState(false); // "verify" | "enroll" | false
  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // ── Cleanup camera on unmount ──
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Check if already logged in ──
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem("adminToken");
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/admin/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            navigate("/admin/dashboard");
            return;
          }
          // Token is invalid/expired — clear it
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
        } catch {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
        }
      }
      setCheckingAuth(false);
    };
    checkExistingAuth();
  }, [navigate]);

  // ── Start webcam ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Camera access required for face verification. Please allow camera permissions.");
    }
  }, []);

  // ── Capture frame as base64 ──
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  // ── Complete login (store tokens, navigate) ──
  const completeLogin = useCallback(
    (data) => {
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      stopCamera();
      navigate("/admin/dashboard");
    },
    [navigate, stopCamera]
  );

  // ── Step 1: Email + Password ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.requireFaceVerification) {
        // Existing face → verify
        setPendingToken(data.pendingToken);
        setPendingUser(data.user);
        setFaceStep("verify");
        setTimeout(() => startCamera(), 100);
      } else if (data.requireFaceEnrollment) {
        // No face yet → enroll
        setPendingToken(data.pendingToken);
        setPendingUser(data.user);
        setFaceStep("enroll");
        setTimeout(() => startCamera(), 100);
      } else {
        // No face needed — done
        completeLogin(data);
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2a: Face Verification (existing face) ──
  const handleFaceVerify = async () => {
    setFaceLoading(true);
    setError("");

    try {
      const faceImage = captureFrame();
      if (!faceImage) {
        throw new Error("Failed to capture image from camera.");
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/auth/verify-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, faceImage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Face verification failed");
      }

      completeLogin(data);
    } catch (err) {
      console.error("Face verification error:", err);
      setError(err.message || "Face verification failed. Please try again.");
    } finally {
      setFaceLoading(false);
    }
  };

  // ── Step 2b: Face Enrollment (first time) ──
  const handleFaceEnroll = async () => {
    setFaceLoading(true);
    setError("");

    try {
      const faceImage = captureFrame();
      if (!faceImage) {
        throw new Error("Failed to capture image from camera.");
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/auth/enroll-face`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, faceImage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Face enrollment failed");
      }

      completeLogin(data);
    } catch (err) {
      console.error("Face enrollment error:", err);
      setError(err.message || "Face enrollment failed. Please try again.");
    } finally {
      setFaceLoading(false);
    }
  };

  // ── Cancel face step ──
  const cancelFace = () => {
    stopCamera();
    setFaceStep(false);
    setPendingToken(null);
    setPendingUser(null);
    setError("");
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
                <span style={styles.featureIcon}>🔐</span>
                <span>Face Recognition Security</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          <div style={styles.formContainer}>
            {!faceStep ? (
              /* ── PASSWORD STEP ── */
              <>
                <div style={styles.formHeader}>
                  <h2 style={styles.formTitle}>Admin Sign In</h2>
                  <p style={styles.formSubtitle}>Enter your admin credentials to continue</p>
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
                      cursor: loading ? "not-allowed" : "pointer",
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
                  🔒 This portal is restricted to authorized administrators only. Regular users
                  should use the <a href="/login" style={styles.link}>main login</a>.
                </p>

                <button onClick={() => navigate("/")} style={styles.backButton}>
                  ← Back to Home
                </button>
              </>
            ) : (
              /* ── FACE STEP (verify or enroll) ── */
              <>
                <div style={styles.formHeader}>
                  <h2 style={styles.formTitle}>
                    {faceStep === "enroll" ? "🔐 Register Your Face" : "🔐 Face Verification"}
                  </h2>
                  <p style={styles.formSubtitle}>
                    Welcome, <strong style={{ color: "#c084fc" }}>{pendingUser?.firstName || pendingUser?.email}</strong>.
                    <br />
                    {faceStep === "enroll"
                      ? "First-time setup: look at the camera to register your face."
                      : "Look at the camera to verify your identity."}
                  </p>
                </div>

                {error && (
                  <div style={styles.errorBox}>
                    <span style={styles.errorIcon}>⚠️</span>
                    {error}
                  </div>
                )}

                {faceStep === "enroll" && (
                  <div style={styles.enrollBanner}>
                    <span style={{ fontSize: 18 }}>ℹ️</span>
                    <span>This is a one-time face registration. Your face will be used for future logins.</span>
                  </div>
                )}

                <div style={styles.cameraContainer}>
                  <video
                    ref={videoRef}
                    style={styles.video}
                    autoPlay
                    playsInline
                    muted
                  />
                  {!cameraReady && (
                    <div style={styles.cameraOverlay}>Starting camera...</div>
                  )}
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button
                    onClick={faceStep === "enroll" ? handleFaceEnroll : handleFaceVerify}
                    disabled={!cameraReady || faceLoading}
                    style={{
                      ...styles.submitButton,
                      flex: 1,
                      opacity: !cameraReady || faceLoading ? 0.6 : 1,
                      cursor: !cameraReady || faceLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {faceLoading ? (
                      <span style={styles.loadingText}>
                        <span style={styles.spinner}>⏳</span>
                        {faceStep === "enroll" ? " Registering..." : " Verifying..."}
                      </span>
                    ) : faceStep === "enroll" ? (
                      "📸 Register Face & Sign In"
                    ) : (
                      "📸 Verify Face"
                    )}
                  </button>
                  <button onClick={cancelFace} style={styles.backButton}>
                    Cancel
                  </button>
                </div>

                <p style={{ ...styles.notice, marginTop: 16 }}>
                  Ensure your face is well-lit and centered in the frame.
                </p>
              </>
            )}
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
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  bgCircle1: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
    top: -200,
    right: -200,
    pointerEvents: "none",
  },
  bgCircle2: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
    bottom: -100,
    left: -100,
    pointerEvents: "none",
  },
  loader: {
    color: "#94a3b8",
    fontSize: 18,
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
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
  },
  leftPanel: {
    flex: 1,
    background: "linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(59,130,246,0.2) 100%)",
    padding: 48,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderRight: "1px solid rgba(255,255,255,0.05)",
  },
  brandContent: {
    color: "#fff",
  },
  shieldIcon: {
    fontSize: 56,
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 16,
    background: "linear-gradient(to right, #fff, #c084fc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  brandSubtitle: {
    fontSize: 16,
    color: "#cbd5e1",
    lineHeight: 1.6,
    marginBottom: 32,
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 15,
    color: "#e2e8f0",
  },
  featureIcon: {
    fontSize: 20,
  },
  rightPanel: {
    flex: 1,
    padding: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.5)",
  },
  formContainer: {
    width: "100%",
    maxWidth: 360,
  },
  formHeader: {
    marginBottom: 32,
    textAlign: "center",
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
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
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#e2e8f0",
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
    boxSizing: "border-box",
  },
  passwordWrapper: {
    position: "relative",
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
    padding: 4,
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
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  loadingText: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  spinner: {
    animation: "spin 1s linear infinite",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "24px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  notice: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 1.6,
  },
  link: {
    color: "#a855f7",
    textDecoration: "none",
  },
  backButton: {
    padding: "12px 24px",
    fontSize: 14,
    color: "#94a3b8",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    cursor: "pointer",
    marginTop: 16,
    transition: "background 0.2s, color 0.2s",
  },
  // Face verification styles
  cameraContainer: {
    position: "relative",
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    background: "#0f172a",
    border: "2px solid rgba(168,85,247,0.3)",
    aspectRatio: "4/3",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transform: "scaleX(-1)", // mirror
  },
  cameraOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.8)",
    color: "#94a3b8",
    fontSize: 14,
  },
  enrollBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    marginBottom: 12,
    borderRadius: 10,
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.3)",
    color: "#93c5fd",
    fontSize: 13,
  },
};
