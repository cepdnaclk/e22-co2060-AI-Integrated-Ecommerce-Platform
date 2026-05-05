import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import "../index.css";

import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
} from "firebase/auth";
import SuccessAnimation from "../components/SuccessAnimation";
import API_BASE_URL from "../config/api";

// ─── Background JWT sync ───────────────────────────────────────────────────
// Called after Firebase auth succeeds. Exchanges the Firebase ID token for
// a backend JWT and writes it to localStorage. Non-blocking — navigation
// to "/" happens BEFORE this resolves so the user is never stuck.
async function syncBackendSession(idToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      let errorMsg = data.message || `HTTP ${response.status}`;

      if (response.status === 502) {
        errorMsg = "Backend service is unreachable. Please check if the server is running.";
      } else if (response.status === 503) {
        errorMsg = "Backend service is temporarily unavailable. Please try again.";
      }

      const error = new Error(errorMsg);
      error.response = response; // Attach response for debugging headers
      throw error;
    }

    const data = await response.json();
    console.log("📥 Backend session sync successful:", data);

    if (!data.token || !data.user) {
      console.error("❌ Backend response is missing critical fields:", data);
      throw new Error("Invalid session data from server");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    console.log("💾 Auth data saved to localStorage. Token exists:", !!data.token);
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error("Cannot connect to backend API. Check network connectivity and server address.");
    }
    throw error;
  }
}

// ─── Component ────────────────────────────────────────────────────────────
const Login = ({ onClose }) => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isSuccess, setIsSuccess] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Stable navigate ref so async callbacks always reach the latest navigate
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Stable onDone for SuccessAnimation — fires navigate once on mount
  const handleLoginDone = useCallback(() => {
    console.log("🚀 REDIRECTION STARTING...");
    const from = location.state?.from?.pathname || "/";
    console.log(`📍 Target destination: ${from}`);

    try {
      // Primary: React Router navigation
      navigate(from, { replace: true });
      
      // Secondary: Hard fallback if React Router is stalled/buggy
      setTimeout(() => {
        if (window.location.pathname !== from && window.location.pathname !== "/dashboard") {
          console.warn("⚠️ React Router navigation seems stalled. Forcing hard reload to:", from);
          window.location.href = from;
        }
      }, 500);
    } catch (err) {
      console.error("❌ Navigation error, forcing hard redirect:", err);
      window.location.href = from;
    }
  }, [navigate, location.state]);

  // ── Handle any leftover redirect result (legacy / fallback) ──────────────
  // We no longer initiate signInWithRedirect, but handle any stored result
  // from a previous attempt so users aren't left in limbo.
  useEffect(() => {
    const handlePendingRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result) return; // Nothing pending — normal case
        setLoading(true);
        const idToken = await result.user.getIdToken();
        
        // Sync backend first
        await syncBackendSession(idToken);

        // Navigate only if successful
        setIsSuccess(true);
        if (onClose) onClose();
      } catch (err) {
        console.error("❌ Google redirect result error:", err);
        if (err.code === "auth/unauthorized-domain") {
          setError(`Unauthorized domain: Add this IP/domain to Firebase Auth → Authorized Domains.`);
        } else if (err.code !== "auth/null-user") {
          setError(err.message || "Failed to authenticate. Please check server connection.");
        }
      } finally {
        setLoading(false);
      }
    };
    handlePendingRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core: Firebase auth → backend sync → navigate ──────
  const handleFirebaseSuccess = useCallback(async (firebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();

      // 1. Sync backend JWT FIRST (Prevents race condition where Home loads before user is in localStorage)
      await syncBackendSession(idToken);
      console.log("✅ Backend session synced");

      // 2. Show Success Animation and Navigate
      setIsSuccess(true);
      if (onClose) onClose();
    } catch (err) {
      console.error("❌ Failed to get Firebase token or sync session:", err);
      // Give a user-friendly message based on the type of error
      const msg = err.message || "";
      if (msg.includes("502") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        const debugUrl = err.response?.headers?.get("X-Debug-Backend-Url") || "";
      setError(`⚠️ Server is currently unreachable. ${debugUrl ? `(Proxy: ${debugUrl})` : "Please try again in a moment."}`);
      } else if (msg.includes("503")) {
        setError("⚠️ Server is starting up. Please wait a few seconds and try again.");
      } else {
        setError(msg || "Failed to authenticate. Please check your connection.");
      }
    }
  }, [onClose]);

  // ── Email + Password login ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleFirebaseSuccess(userCredential.user);
    } catch (err) {
      console.error("❌ Email login error:", err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google login ─────────────────────────────────────────────────────────
  // Use signInWithPopup on ALL devices (including mobile HTTPS).
  // signInWithRedirect triggers a full-page reload which:
  //   • loses React state on mobile
  //   • re-mounts the login page briefly before getRedirectResult resolves
  //   • causes the "bouncing back to login" symptom on mobile HTTPS
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await handleFirebaseSuccess(result.user);
    } catch (err) {
      console.error("❌ Google login error:", err);
      if (err.code === "auth/unauthorized-domain") {
        setError(`Unauthorized domain: Add this device's IP to Firebase Auth → Authorized Domains.`);
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked by the browser. Please allow popups for this site and try again.");
      } else if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-[#0d1424] via-[#072454] to-[#1945a5]">
        <SuccessAnimation
          message="Login Successful!"
          onDone={handleLoginDone}
        />
      </div>
    );
  }

  // ── Login form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 bg-blue-100">

      {/* LEFT PANEL */}
      <div className="hidden md:flex relative flex-col justify-center px-12 text-white bg-gradient-to-br from-[#0d1424] via-[#072454] to-[#1945a5]">
        <h2 className="text-4xl font-bold mb-6">WELCOME</h2>
        <p className="text-blue-100 max-w-md leading-relaxed">
          Log in to access your dashboard and manage your account securely.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center bg-white min-h-screen md:min-h-0 py-12 md:py-0">
        <div className="w-full max-w-md px-8">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">
            Sign in
          </h3>

          {error && (
            <p className="mb-4 bg-red-100 text-red-600 text-sm p-2 rounded">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-sm text-blue-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {/* GOOGLE LOGIN */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full border border-gray-300 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Continue with Google
            </button>

          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
