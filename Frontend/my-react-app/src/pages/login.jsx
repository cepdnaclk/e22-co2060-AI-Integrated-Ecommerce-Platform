import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
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

  // Stable navigate ref so async callbacks always reach the latest navigate
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Stable onDone for SuccessAnimation — fires navigate once on mount
  const handleLoginDone = useCallback(() => {
    navigateRef.current("/", { replace: true });
  }, []);

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
        // Navigate immediately — sync backend in background
        setIsSuccess(true);
        if (onClose) onClose();
        syncBackendSession(idToken).catch((err) => {
          console.warn("⚠️ Background backend sync failed (redirect):", err.message);
        });
      } catch (err) {
        console.error("❌ Google redirect result error:", err);
        if (err.code === "auth/unauthorized-domain") {
          setError(`Unauthorized domain: Add this IP/domain to Firebase Auth → Authorized Domains.`);
        } else if (err.code !== "auth/null-user") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    handlePendingRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core: Firebase auth → navigate immediately → backend sync in bg ──────
  const handleFirebaseSuccess = useCallback(async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken();

    // 1. Navigate home IMMEDIATELY — don't block on the backend call
    setIsSuccess(true);
    if (onClose) onClose();

    // 2. Sync backend JWT in the background
    syncBackendSession(idToken)
      .then(() => {
        console.log("✅ Backend session synced");
      })
      .catch((err) => {
        console.warn("⚠️ Background backend sync failed:", err.message);
        // User is already on the home page. They will only be prompted
        // to re-login when hitting a protected API call — acceptable trade-off.
      });
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
        </div>
      </div>
    </div>
  );
};

export default Login;
