import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { dmsService } from "../services/dmsService";

export default function DmsQrScanner() {
  const scannerRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [manualQrText, setManualQrText] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const barcodeDetectorAvailable = true; // html5-qrcode is a polyfill/library that works in most browsers

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const submitQr = useCallback(
    async (rawQrText, source = "manual") => {
      const qrText = `${rawQrText || ""}`.trim();
      if (!qrText || scanBusy) {
        return;
      }

      setScanBusy(true);
      setError("");
      setSuccess("");

      try {
        const result = await dmsService.scanSellerQr({
          qrText,
          notes:
            source === "camera"
              ? "Scanned from delivery center camera reader."
              : "Submitted from delivery center manual reader.",
          metadata: {
            source,
          },
        });

        setLastResult(result);
        setManualQrText(qrText);
        setSuccess(result?.message || "QR scanned successfully.");
        if (source === "camera") {
          await stopCamera();
        }
      } catch (err) {
        setError(err.message || "Failed to scan seller QR");
      } finally {
        setScanBusy(false);
      }
    },
    [scanBusy, stopCamera]
  );

  const startCamera = () => {
    setError("");
    setSuccess("");
    setCameraActive(true);
  };

  useEffect(() => {
    let isMounted = true;
    const initScanner = async () => {
      if (cameraActive) {
        try {
          const scanner = new Html5Qrcode("reader-container");
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              if (isMounted) submitQr(decodedText, "camera");
            },
            () => {}
          );
        } catch (err) {
          if (isMounted) {
            setError(err.message || "Failed to start camera scanner.");
            setCameraActive(false);
          }
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error("Cleanup stop error", e));
      }
    };
  }, [cameraActive, submitQr]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const portal = await dmsService.getPortalProfile();
        setProfile(portal);
      } catch (err) {
        setError(err.message || "Failed to load delivery center profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);


  const handleManualSubmit = async (event) => {
    event.preventDefault();
    await submitQr(manualQrText, "manual");
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Delivery Center QR Reader</h1>
            <p style={S.subtitle}>
              Scan seller QR to register transfer from seller to delivery company.
            </p>
            <p style={S.subtleMeta}>
              {loadingProfile
                ? "Loading center profile..."
                : `${profile?.branch?.branchName || "Delivery Center"} • ${profile?.staff?.fullName || ""}`}
            </p>
          </div>
          <div style={S.headerActions}>
            <Link to="/dms/center/dashboard" style={S.ghostBtn}>← Back to Dashboard</Link>
            {!cameraActive ? (
              <button type="button" style={S.primaryBtn} onClick={startCamera} disabled={scanBusy}>
                Start Camera Scan
              </button>
            ) : (
              <button type="button" style={S.warnBtn} onClick={stopCamera}>
                Stop Camera
              </button>
            )}
          </div>
        </div>

        {error ? <div style={S.error}>{error}</div> : null}
        {success ? <div style={S.success}>{success}</div> : null}

        <div style={S.grid}>
          <div style={S.card}>
            <h2 style={S.cardTitle}>Camera Scanner</h2>
            <p style={S.cardText}>
              Position seller QR inside camera view. Scan runs automatically.
            </p>
            {!barcodeDetectorAvailable ? (
              <div style={S.info}>
                Camera QR detection is not available in this browser. Use manual QR text input.
              </div>
            ) : null}
            <div style={S.videoWrap} id="reader-container">
              {!cameraActive ? <div style={S.videoOverlay}>Camera is idle</div> : null}
            </div>
          </div>

          <div style={S.card}>
            <h2 style={S.cardTitle}>Manual QR Input</h2>
            <p style={S.cardText}>
              Paste scanned QR text and submit if camera scan is unavailable.
            </p>
            <form onSubmit={handleManualSubmit} style={S.form}>
              <textarea
                style={S.textarea}
                placeholder="Example: SOQR4:660f9c5f56c2a74f2c5a4c1b"
                value={manualQrText}
                onChange={(e) => setManualQrText(e.target.value)}
                rows={5}
              />
              <button type="submit" style={S.primaryBtn} disabled={scanBusy}>
                {scanBusy ? "Processing..." : "Submit QR"}
              </button>
            </form>
          </div>
        </div>

        {lastResult ? (
          <div style={S.card}>
            <h2 style={S.cardTitle}>Last Scan Result</h2>
            <div style={S.resultGrid}>
              <ResultItem label="Tracking Number" value={lastResult?.deliveryOrder?.trackingNumber || "N/A"} />
              <ResultItem label="Delivery Status" value={lastResult?.deliveryOrder?.status || "N/A"} />
              <ResultItem label="Order ID" value={lastResult?.ecommerceOrder?.id || "N/A"} />
              <ResultItem label="Order Status" value={lastResult?.ecommerceOrder?.status || "N/A"} />
              <ResultItem label="Event Type" value={lastResult?.event?.scanType || "N/A"} />
              <ResultItem label="Event Time" value={formatDate(lastResult?.event?.occurredAt)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultItem({ label, value }) {
  return (
    <div style={S.resultItem}>
      <div style={S.resultLabel}>{label}</div>
      <div style={S.resultValue}>{value || "N/A"}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    padding: "30px 20px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gap: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    fontSize: 14,
  },
  subtleMeta: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 12,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 16,
    fontWeight: 700,
  },
  cardText: {
    margin: "0 0 10px",
    color: "#94a3b8",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  form: {
    display: "grid",
    gap: 10,
  },
  textarea: {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 10,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 13,
    boxSizing: "border-box",
    resize: "vertical",
    outline: "none",
  },
  primaryBtn: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    background: "linear-gradient(to right, #7e22ce, #a855f7)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  warnBtn: {
    border: "1px solid rgba(251,191,36,0.35)",
    borderRadius: 10,
    padding: "10px 14px",
    background: "rgba(251,191,36,0.14)",
    color: "#fde68a",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  ghostBtn: {
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.04)",
    color: "#e2e8f0",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
  },
  videoWrap: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "#000",
    minHeight: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    maxHeight: 360,
    objectFit: "cover",
  },
  videoOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    background: "rgba(2,6,23,0.58)",
    fontSize: 13,
    fontWeight: 600,
  },
  info: {
    background: "rgba(59,130,246,0.12)",
    border: "1px solid rgba(59,130,246,0.3)",
    color: "#93c5fd",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    marginBottom: 10,
  },
  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
  },
  success: {
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.3)",
    color: "#86efac",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 10,
  },
  resultItem: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "10px 12px",
  },
  resultLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: 700,
    wordBreak: "break-word",
  },
};
