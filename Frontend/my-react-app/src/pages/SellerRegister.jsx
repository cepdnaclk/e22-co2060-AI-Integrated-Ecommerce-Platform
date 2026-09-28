import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { registerSeller } from "../services/sellerService";
import API_BASE_URL from "../config/api";
import "./sellerRegister.css";

const BecomeSeller = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    shopName: "",
    description: "",
    address: "",
    phone: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // "idle" → "waiting" (email sent) → "verified" (polling success) → redirect
  const [phase, setPhase] = useState("idle");

  const pollRef = useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await registerSeller(form);
      setPhase("waiting");
      startPolling();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  /** Poll /api/sellers/me every 3 seconds until seller account exists */
  const startPolling = () => {
    const token = localStorage.getItem("token");

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/sellers/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.newToken) {
            localStorage.setItem("token", data.newToken);
            try {
              const u = JSON.parse(localStorage.getItem("user") || "{}");
              u.role = "seller";
              localStorage.setItem("user", JSON.stringify(u));
            } catch (e) {}
          }

          // ✅ Seller account now exists — verification complete!
          clearInterval(pollRef.current);
          setPhase("verified");

          // Redirect to dashboard after animation finishes (4s)
          setTimeout(() => navigate("/seller/dashboard"), 4000);
        }
      } catch {
        // Network blip — just keep polling
      }
    }, 3000);
  };

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* ================= VERIFIED — SVG Animation ================= */
  if (phase === "verified") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0d1424, #072454, #1945a5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <style>{`
          @keyframes drawCircle {
            0%   { stroke-dashoffset: 283; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes drawCheck {
            0%   { stroke-dashoffset: 100; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .sv-circle {
            fill: none; stroke: #22c55e; stroke-width: 5;
            stroke-linecap: round;
            stroke-dasharray: 283; stroke-dashoffset: 283;
            animation: drawCircle 1s ease-out forwards;
            transform-origin: center;
            transform: rotate(-90deg);
          }
          .sv-check {
            fill: none; stroke: #22c55e; stroke-width: 5;
            stroke-linecap: round; stroke-linejoin: round;
            stroke-dasharray: 100; stroke-dashoffset: 100;
            animation: drawCheck 0.6s ease-out forwards;
            animation-delay: 0.95s;
          }
          .sv-title {
            margin-top: 28px; font-size: 26px; font-weight: bold;
            opacity: 0;
            animation: fadeUp 0.6s ease forwards;
            animation-delay: 1.6s;
          }
          .sv-sub {
            margin-top: 10px; font-size: 15px; color: #94a3b8;
            opacity: 0;
            animation: fadeUp 0.6s ease forwards;
            animation-delay: 2s;
          }
        `}</style>

        <svg width="130" height="130" viewBox="0 0 100 100">
          {/* Dim background track */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(34,197,94,0.12)" strokeWidth="5" />
          {/* Animated circle */}
          <circle className="sv-circle" cx="50" cy="50" r="45" />
          {/* Animated checkmark */}
          <polyline className="sv-check" points="27,52 42,67 73,36" />
        </svg>

        <h2 className="sv-title">Seller Account Verified! 🎉</h2>
        <p className="sv-sub">Redirecting to your Seller Dashboard…</p>
      </div>
    );
  }

  /* ================= WAITING — Check your email screen ================= */
  if (phase === "waiting") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0d1424, #072454, #1945a5)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <style>{`
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
          .email-pulse { animation: pulse 2s ease-in-out infinite; }
        `}</style>

        <div className="email-pulse" style={{ fontSize: 72, marginBottom: 24 }}>📧</div>
        <h2 style={{ fontSize: 26, fontWeight: "bold", marginBottom: 12 }}>
          Check Your Email!
        </h2>
        <p style={{ color: "#94a3b8", maxWidth: 420, fontSize: 16, lineHeight: 1.7 }}>
          We've sent a verification link to your email.<br />
          Click <strong style={{ color: "#4ac6ff" }}>Verify Seller Account</strong> in the email
          and this page will automatically continue.
        </p>
        <p style={{ color: "#64748b", marginTop: 16, fontSize: 13 }}>
          Waiting for verification… · Link expires in 1 hour
        </p>

        {/* Animated waiting dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#4ac6ff",
                animation: `pulse 1.2s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ================= FORM SCREEN ================= */
  return (
    <div className="seller-bg">
      <div className="seller-glass-card">

        <h2 className="seller-title">Become a Seller</h2>
        <p className="seller-subtitle">
          Start selling your products and grow your business
        </p>

        {error && <div className="seller-error">{error}</div>}

        <form onSubmit={handleSubmit} className="seller-form">
          <input name="shopName" placeholder="Seller / Business Name" onChange={handleChange} required />
          <input name="description" placeholder="Description" onChange={handleChange} />
          <input name="address" placeholder="Business Address" onChange={handleChange} />
          <input name="phone" placeholder="Phone Number" onChange={handleChange} />
          <button disabled={loading}>
            {loading ? "Registering..." : "Create Seller Account"}
          </button>
        </form>

      </div>
    </div>
  );
};

export default BecomeSeller;