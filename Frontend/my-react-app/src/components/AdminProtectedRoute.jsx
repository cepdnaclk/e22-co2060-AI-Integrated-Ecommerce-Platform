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
          if (data.success && data.user?.role === "admin") {
            setAuthState("authorized");
          } else {
            setAuthState("unauthorized");
          }
        } else {
          // Token invalid or expired
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          setAuthState("unauthorized");
        }
      } catch (error) {
        console.error("Admin auth verification failed:", error);
        setAuthState("unauthorized");
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
