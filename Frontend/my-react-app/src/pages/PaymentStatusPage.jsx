import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getPaymentStatus } from "../services/paymentService";

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px"
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    backdropFilter: "blur(12px)",
    padding: "40px 36px",
    maxWidth: 520,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
  },
  btnPrimary: {
    background: "linear-gradient(to right, #006494, #0582ca)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    marginTop: 20,
    transition: "transform 0.2s"
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.08)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    marginTop: 20,
    marginLeft: 12
  }
};

export default function PaymentStatusPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [pollingCount, setPollingCount] = useState(0);

  const fetchStatus = async () => {
    try {
      const data = await getPaymentStatus(orderId);
      setPaymentData(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message || "Unable to retrieve payment status");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [orderId]);

  // Poll status every 3 seconds if status is "pending" (max 10 retries = 30s)
  useEffect(() => {
    if (paymentData && paymentData.paymentStatus === "pending" && pollingCount < 10) {
      const timer = setTimeout(async () => {
        const updated = await fetchStatus();
        setPollingCount((prev) => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentData, pollingCount]);

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid rgba(255,255,255,0.1)",
              borderTop: "4px solid #0582ca",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px"
            }}
          />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Checking Payment Status…</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>
            Please wait while we verify your PayHere transaction with the server.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>❓</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f87171" }}>Status Unknown</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>{error}</p>
          <div style={{ marginTop: 20 }}>
            <button style={S.btnPrimary} onClick={() => fetchStatus()}>
              🔄 Retry Status Check
            </button>
            <Link to="/orders" style={S.btnSecondary}>
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = paymentData?.paymentStatus || "pending";

  const renderStatusContent = () => {
    switch (status) {
      case "paid":
        return (
          <>
            <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#4ade80", margin: "0 0 10px" }}>
              Payment Successful!
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 20 }}>
              Your payment has been received and verified by PayHere. Your order has been placed.
            </p>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "16px 20px",
                textAlign: "left",
                marginBottom: 24,
                fontSize: 14,
                color: "#94a3b8"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Order ID:</span>
                <span style={{ color: "#fff", fontWeight: 700 }}>{paymentData.orderId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Amount Paid:</span>
                <span style={{ color: "#4ade80", fontWeight: 700 }}>
                  Rs. {Number(paymentData.totalAmount || 0).toLocaleString()} {paymentData.currency || "LKR"}
                </span>
              </div>
              {paymentData.payhereMethod && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Payment Method:</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{paymentData.payhereMethod}</span>
                </div>
              )}
              {paymentData.paymentDate && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Payment Date:</span>
                  <span style={{ color: "#cbd5e1" }}>
                    {new Date(paymentData.paymentDate).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <Link to="/orders" style={S.btnPrimary}>
              📦 View My Orders
            </Link>
          </>
        );

      case "pending":
        return (
          <>
            <div style={{ fontSize: 72, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#facc15", margin: "0 0 10px" }}>
              Payment Pending
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 20 }}>
              We are awaiting PayHere payment notification. If you have completed the payment, this page will update automatically.
            </p>

            <div style={{ marginTop: 20 }}>
              <button style={S.btnPrimary} onClick={() => fetchStatus()}>
                🔄 Refresh Status Now
              </button>
              <Link to="/orders" style={S.btnSecondary}>
                View Orders
              </Link>
            </div>
          </>
        );

      case "failed":
        return (
          <>
            <div style={{ fontSize: 72, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#f87171", margin: "0 0 10px" }}>
              Payment Failed
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 20 }}>
              Your transaction was declined or failed to process. Please try again or use a different payment method.
            </p>

            <Link to="/checkout" style={S.btnPrimary}>
              💳 Return to Checkout
            </Link>
            <Link to="/cart" style={S.btnSecondary}>
              Back to Cart
            </Link>
          </>
        );

      case "cancelled":
        return (
          <>
            <div style={{ fontSize: 72, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fb923c", margin: "0 0 10px" }}>
              Payment Cancelled
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 20 }}>
              You cancelled the PayHere payment process. Your order has not been charged.
            </p>

            <Link to="/checkout" style={S.btnPrimary}>
              💳 Try Again
            </Link>
            <Link to="/cart" style={S.btnSecondary}>
              Back to Cart
            </Link>
          </>
        );

      case "chargedback":
        return (
          <>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🚫</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#ef4444", margin: "0 0 10px" }}>
              Payment Charged Back
            </h2>
            <p style={{ color: "#cbd5e1", fontSize: 15, marginBottom: 20 }}>
              This payment transaction was marked as charged back.
            </p>

            <Link to="/orders" style={S.btnPrimary}>
              View Orders
            </Link>
          </>
        );

      default:
        return (
          <>
            <div style={{ fontSize: 72, marginBottom: 16 }}>❓</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#cbd5e1" }}>Unknown Status</h2>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Status: {status}</p>
            <Link to="/orders" style={S.btnPrimary}>
              View My Orders
            </Link>
          </>
        );
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>{renderStatusContent()}</div>
    </div>
  );
}
