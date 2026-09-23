import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import API_BASE_URL from "../config/api";

/**
 * ======================================================
 * ADMIN PROTECTED ROUTE WRAPPER
 * Verifies admin token before rendering protected pages
 * Redirects to admin login if not authenticated
 * ======================================================
 */

export default function AdminProtectedRoute({ children }) {
  const [authState, setAuthState] = useState("checking"); // checking | authorized | unauthorized
  const location = useLocation();

  useEffect(() => {
    const verifyAdmin = async () => {
      // Check for admin token
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      
      if (!token) {
        setAuthState("unauthorized");
        return;
      }

      try {
        // Verify token with backend
        const res = await fetch(`${API_BASE_URL}/api/admin/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && (data.user?.role === "admin" || data.user?.role === "ceo")) {
            // Store role for UI rendering
            const existing = JSON.parse(localStorage.getItem("adminUser") || "{}");
            if (data.user.role !== existing.role) {
              localStorage.setItem("adminUser", JSON.stringify({ ...existing, ...data.user }));
            }
            setAuthState("authorized");
          } else {
            setAuthState("unauthorized");
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token explicitly rejected by the server — clear it and redirect
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          setAuthState("unauthorized");
        } else {
          // Server returned a non-auth error (5xx, etc.) — don't log the user out.
          // If we have a token, trust it optimistically to avoid spurious logouts
          // that cause the login-redirect loop on mobile HTTPS.
          console.warn("Admin verify returned unexpected status:", res.status);
          setAuthState("authorized");
        }
      } catch (error) {
        // Network/fetch error (self-signed cert not yet accepted, proxy hiccup, etc.)
        // Do NOT clear the token or redirect — that causes the login loop on mobile.
        // If a token exists, allow access optimistically; the backend will reject
        // the token on any actual API call if it is invalid.
        console.warn("Admin auth verification network error (non-fatal):", error.message);
        setAuthState("authorized");
      }
    };

    verifyAdmin();
  }, []);

  // Loading state
  if (authState === "checking") {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}>🔐</div>
          <p style={styles.loadingText}>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Unauthorized - redirect to admin login
  if (authState === "unauthorized") {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Authorized - render children
  return children;
}

const styles = {
  loadingContainer: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  loadingContent: {
    textAlign: "center"
  },
  spinner: {
    fontSize: 48,
    marginBottom: 16,
    animation: "pulse 1.5s ease-in-out infinite"
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 16
  }
};
