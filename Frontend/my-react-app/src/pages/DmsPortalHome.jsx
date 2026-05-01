import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dmsService } from "../services/dmsService";

export default function DmsPortalHome() {
  const navigate = useNavigate();

  useEffect(() => {
    const resolve = async () => {
      try {
        const profile = await dmsService.getPortalProfile();
        navigate(profile.dashboardRoute || "/dms/center/dashboard", { replace: true });
      } catch {
        navigate("/dms/login", { replace: true });
      }
    };
    resolve();
  }, [navigate]);

  return (
    <div style={S.page}>
      <div style={S.text}>Loading delivery dashboard...</div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#94a3b8",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  text: {
    fontSize: 14,
  },
};

