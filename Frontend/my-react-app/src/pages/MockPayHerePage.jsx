import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getPaymentStatus,
  simulateTestPayment
} from "../services/paymentService";

export default function MockPayHerePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const params = new URLSearchParams(location.search);

  const orderId = params.get("orderId");
  const amount = params.get("amount");
  const currency = params.get("currency") || "LKR";

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is missing.");
      return;
    }

    getPaymentStatus(orderId)
      .then(setPayment)
      .catch((err) => {
        console.error(err);
      });
  }, [orderId]);

  const handlePayNow = async () => {
    if (!orderId) {
      setError("Order ID is missing.");
      return;
    }

    try {
      setPaying(true);
      setError("");

      console.log("🧪 Mock PayHere payment:", orderId);

      await simulateTestPayment(orderId);

      console.log("✅ Mock payment successful");

      navigate(`/payment/status/${encodeURIComponent(orderId)}`);
    } catch (err) {
      console.error("❌ Mock payment failed:", err);
      setError(err.message || "Payment failed.");
      setPaying(false);
    }
  };

  const handleCancel = () => {
    navigate("/checkout");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.logo}>
          PayHere
        </div>

        <div style={styles.demoBadge}>
          DEMO PAYMENT
        </div>

        <h1 style={styles.title}>
          Complete Your Payment
        </h1>

        <p style={styles.subtitle}>
          This is a mock PayHere checkout for BEETA development.
        </p>

        <div style={styles.amountBox}>
          <div style={styles.amountLabel}>
            Amount
          </div>

          <div style={styles.amount}>
            {currency} {Number(amount || 0).toLocaleString()}
          </div>
        </div>

        <div style={styles.details}>

          <div style={styles.row}>
            <span>Order ID</span>
            <strong>{orderId || "N/A"}</strong>
          </div>

          <div style={styles.row}>
            <span>Payment Status</span>
            <strong>
              {payment?.paymentStatus || "pending"}
            </strong>
          </div>

        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <button
          onClick={handlePayNow}
          disabled={paying}
          style={{
            ...styles.payButton,
            opacity: paying ? 0.6 : 1,
          }}
        >
          {paying ? "Processing..." : "Pay Now"}
        </button>

        <button
          onClick={handleCancel}
          disabled={paying}
          style={styles.cancelButton}
        >
          Cancel
        </button>

        <div style={styles.security}>
          🔒 Mock payment environment
        </div>

        <div style={styles.note}>
          No real money will be charged.
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "470px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "22px",
    padding: "35px",
    boxShadow: "0 25px 70px rgba(0,0,0,0.5)",
    backdropFilter: "blur(15px)",
    textAlign: "center",
  },

  logo: {
    fontSize: "34px",
    fontWeight: "800",
    marginBottom: "10px",
  },

  demoBadge: {
    display: "inline-block",
    padding: "6px 14px",
    borderRadius: "20px",
    background: "rgba(5,130,202,0.18)",
    border: "1px solid rgba(5,130,202,0.45)",
    color: "#67d5ff",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1px",
    marginBottom: "25px",
  },

  title: {
    fontSize: "24px",
    margin: "0 0 8px",
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: "13px",
    lineHeight: 1.5,
    marginBottom: "25px",
  },

  amountBox: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: "15px",
    padding: "22px",
    marginBottom: "20px",
  },

  amountLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },

  amount: {
    fontSize: "30px",
    fontWeight: "800",
  },

  details: {
    textAlign: "left",
    marginBottom: "20px",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    padding: "12px 0",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    fontSize: "13px",
  },

  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "15px",
    fontSize: "13px",
  },

  payButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: "11px",
    background: "linear-gradient(to right, #006494, #0582ca)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    marginBottom: "12px",
  },

  cancelButton: {
    width: "100%",
    padding: "14px",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "11px",
    background: "rgba(255,255,255,0.04)",
    color: "#cbd5e1",
    fontSize: "15px",
    cursor: "pointer",
  },

  security: {
    marginTop: "22px",
    color: "#4ade80",
    fontSize: "12px",
  },

  note: {
    marginTop: "6px",
    color: "#64748b",
    fontSize: "11px",
  },
};
