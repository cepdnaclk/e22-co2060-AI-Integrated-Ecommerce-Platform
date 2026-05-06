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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-lg">Verifying session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] flex items-center justify-center p-4 sm:p-6 font-sans">
      
      {/* Background decoration */}
      <div className="absolute w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full bg-purple-500/10 blur-[100px] -top-20 -right-20 pointer-events-none" />
      <div className="absolute w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] rounded-full bg-blue-500/10 blur-[100px] -bottom-20 -left-20 pointer-events-none" />

      <div className="w-full max-w-5xl bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10">
        
        {/* Left Panel - Branding (Hidden or Smaller on Mobile) */}
        <div className="flex-1 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-8 sm:p-12 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-center">
          <div className="text-center md:text-left">
            <div className="text-4xl sm:text-6xl mb-6 drop-shadow-lg">🛡️</div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
              Admin Portal
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8">
              Secure access to inventory management, analytics, and system controls.
            </p>
            
            <div className="hidden sm:grid grid-cols-1 gap-4">
              {[
                { icon: "📊", text: "Inventory Management" },
                { icon: "📦", text: "Product Catalog Control" },
                { icon: "👥", text: "User Administration" },
                { icon: "🔐", text: "Face Recognition Security" }
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-200">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm font-medium">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Forms */}
        <div className="flex-1 p-8 sm:p-12 flex items-center justify-center bg-slate-950/40">
          <div className="w-full max-w-sm">
            {!faceStep ? (
              /* ── PASSWORD STEP ── */
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Admin Sign In</h2>
                  <p className="text-slate-400 text-sm">Enter your admin credentials to continue</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-6 flex items-center gap-3 text-sm animate-shake">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5 ml-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="admin@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1.5 ml-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]
                      ${loading ? "bg-purple-600/50 cursor-not-allowed" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90"}
                    `}
                    disabled={loading}
                  >
                    {loading ? "⌛ Authenticating..." : "Sign In to Admin Portal"}
                  </button>
                </form>

                <div className="flex items-center gap-4 my-8">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Admin Access Only</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="text-center space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    🔒 This portal is restricted to authorized administrators only.
                  </p>
                  <button 
                    onClick={() => navigate("/")} 
                    className="text-slate-400 hover:text-white text-sm font-medium transition-colors border border-white/5 px-6 py-2.5 rounded-lg hover:bg-white/5"
                  >
                    ← Back to Home
                  </button>
                </div>
              </>
            ) : (
              /* ── FACE STEP (verify or enroll) ── */
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {faceStep === "enroll" ? "🔐 Face Setup" : "🔐 Verification"}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Welcome, <span className="text-purple-400 font-bold">{pendingUser?.firstName || "Admin"}</span>
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4 text-xs">
                    ⚠️ {error}
                  </div>
                )}

                <div className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden border-2 border-purple-500/30 bg-slate-950 shadow-inner">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    autoPlay
                    playsInline
                    muted
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-slate-400 text-sm">
                      Starting camera...
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={faceStep === "enroll" ? handleFaceEnroll : handleFaceVerify}
                    disabled={!cameraReady || faceLoading}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg
                      ${!cameraReady || faceLoading 
                        ? "bg-slate-700 cursor-not-allowed" 
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 active:scale-[0.98] shadow-emerald-500/20"}
                    `}
                  >
                    {faceLoading ? "⌛ Verifying..." : "📸 Take Photo & Proceed"}
                  </button>
                  <button 
                    onClick={cancelFace} 
                    className="w-full py-3 text-slate-400 font-medium hover:text-white transition-colors border border-white/5 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 text-center mt-4">
                  Ensure your face is centered and well-lit.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out 2; }
      `}</style>
    </div>
  );
}

