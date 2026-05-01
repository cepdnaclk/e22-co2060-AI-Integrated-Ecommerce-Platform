import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { dmsService } from "../services/dmsService";

export default function DmsProtectedRoute({ children, allowedScopes = ["branch", "rider"] }) {
  const [state, setState] = useState("checking");
  const [profile, setProfile] = useState(null);
  const location = useLocation();

  const allowedScopeSet = useMemo(() => new Set(allowedScopes), [allowedScopes]);

  useEffect(() => {
    const verify = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setState("unauthorized");
          return;
        }

        const portalProfile = await dmsService.getPortalProfile();
        if (!portalProfile?.actor?.scope) {
          setState("unauthorized");
          return;
        }

        setProfile(portalProfile);
        if (allowedScopeSet.size > 0 && !allowedScopeSet.has(portalProfile.actor.scope)) {
          setState("forbidden");
          return;
        }

        setState("authorized");
      } catch (err) {
        // Only redirect to login if it's an explicit auth error (401/403).
        // Network errors (proxy hiccup, self-signed cert, etc.) should NOT
        // kick the user out — that causes the login-redirect loop on mobile HTTPS.
        const msg = err?.message || "";
        const isAuthError =
          msg.includes("401") ||
          msg.includes("403") ||
          msg.includes("Authentication token not found") ||
          msg.includes("Unauthorized") ||
          msg.includes("Forbidden");

        if (isAuthError) {
          setState("unauthorized");
        } else {
          // Non-auth error — allow access optimistically if token exists.
          // The backend will reject invalid tokens on any real API call.
          console.warn("DMS portal verify non-fatal error:", msg);
          setState("authorized");
        }
      }
    };

    verify();
  }, [allowedScopeSet]);

  if (state === "checking") {
    return (
      <div style={S.loaderPage}>
        <div style={S.loaderCard}>
          <div style={S.spinner}>🚚</div>
          <div style={S.loaderText}>Validating delivery portal access...</div>
        </div>
      </div>
    );
  }

  if (state === "unauthorized") {
    return <Navigate to="/dms/login" state={{ from: location }} replace />;
  }

  if (state === "forbidden") {
    const fallback = profile?.dashboardRoute || "/dms/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

const S = {
  loaderPage: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
  },
  loaderCard: {
    textAlign: "center",
  },
  spinner: {
    fontSize: 48,
    marginBottom: 12,
  },
  loaderText: {
    color: "#94a3b8",
    fontSize: 14,
  },
};

