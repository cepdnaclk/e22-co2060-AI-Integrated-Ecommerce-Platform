import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMySellerProfile } from "../services/sellerService";
import {
  fetchMySellerOrders,
  submitPackingProof,
  getSellerQr,
} from "../services/sellerOrderQrService";

const STATUS_META = {
  not_submitted: { label: "Not submitted", color: "#94a3b8", bg: "rgba(71,85,105,0.2)", border: "rgba(71,85,105,0.35)" },
  pending: { label: "Pending review", color: "#facc15", bg: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.35)" },
  approved: { label: "Approved", color: "#4ade80", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.35)" },
  rejected: { label: "Rejected", color: "#f87171", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.35)" },
};

function getQrDisplayData(qrInfo) {
  const payload = qrInfo?.qrPayload || {};
  const order = payload.order || {};
  const customer = payload.customer || {};
  const shippingAddress = payload.shippingAddress || {};
  const location = payload.location || {};

  const orderId = order.orderId || payload.orderId || "N/A";
  const customerName = customer.fullName || payload.customerName || "N/A";
  const address =
    shippingAddress.formattedAddress ||
    payload.address ||
    [shippingAddress.street, shippingAddress.city].filter(Boolean).join(", ") ||
    "N/A";

  const latValue = Number(location.lat ?? payload.lat);
  const lngValue = Number(location.lng ?? payload.lng);
  const locationText =
    Number.isFinite(latValue) && Number.isFinite(lngValue)
      ? `${latValue.toFixed(6)}, ${lngValue.toFixed(6)}`
      : "N/A";

  return {
    orderId,
    customerName,
    address,
    locationText,
    qrText: qrInfo?.qrText || payload.qrText || "",
  };
}

export default function SellerOrderQr() {
  const [seller, setSeller] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingOrderId, setSubmittingOrderId] = useState("");
  const [qrLoadingOrderId, setQrLoadingOrderId] = useState("");
  const [formState, setFormState] = useState({});
  const [qrState, setQrState] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [sellerInfo, sellerOrders] = await Promise.all([
          getMySellerProfile(),
          fetchMySellerOrders(),
        ]);
        setSeller(sellerInfo);
        setOrders(sellerOrders);
      } catch (err) {
        setError(err.message || "Failed to load seller QR page");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders]
  );

  const setField = (orderId, key, value) => {
    setFormState((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [key]: value,
      },
    }));
  };

  const replaceOrder = (nextOrder) => {
    setOrders((prev) => prev.map((o) => (o._id === nextOrder._id ? nextOrder : o)));
  };

  const handleSubmitProof = async (order) => {
    try {
      const form = formState[order._id] || {};
      if (!form.productName?.trim() || !form.skuOrImei?.trim() || !form.file) {
        alert("Please provide packed product name, SKU/IMEI, and an image.");
        return;
      }

      setSubmittingOrderId(order._id);
      const result = await submitPackingProof(order._id, {
        productName: form.productName.trim(),
        skuOrImei: form.skuOrImei.trim(),
        proofImage: form.file,
      });
      replaceOrder(result.order);
      setQrState((prev) => {
        const next = { ...prev };
        delete next[order._id];
        return next;
      });
      alert("Packing proof submitted. Waiting for admin verification.");
    } catch (err) {
      alert(err.message || "Failed to submit packing proof");
    } finally {
      setSubmittingOrderId("");
    }
  };

  const handleGenerateQr = async (orderId) => {
    try {
      setQrLoadingOrderId(orderId);
      const result = await getSellerQr(orderId);
      setQrState((prev) => ({ ...prev, [orderId]: result }));
    } catch (err) {
      alert(err.message || "Failed to generate seller QR");
    } finally {
      setQrLoadingOrderId("");
    }
  };

  if (loading) {
    return (
      <div style={S.pg}>
        <div style={S.empty}>Loading seller QR workspace…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.pg}>
        <div style={S.empty}>{error}</div>
      </div>
    );
  }

  return (
    <div style={S.pg}>
      <div style={S.wrap}>
        <div style={S.headerRow}>
          <div>
            <h1 style={S.title}>Seller QR Workspace</h1>
            <p style={S.subtitle}>
              Upload packing proof, wait for admin verification, then generate Seller QR.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/seller/dashboard" style={{ ...S.btn, ...S.btnGhost }}>← Dashboard</Link>
            <span style={{ ...S.badge, background: "rgba(5,130,202,0.2)", border: "1px solid rgba(5,130,202,0.35)" }}>
              {seller?.shopName || "Seller"}
            </span>
          </div>
        </div>

        {sortedOrders.length === 0 ? (
          <div style={S.empty}>No seller orders available yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {sortedOrders.map((order) => {
              const qrStatus = order.sellerQr?.verificationStatus || "not_submitted";
              const qrMeta = STATUS_META[qrStatus] || STATUS_META.not_submitted;
              const form = formState[order._id] || {};
              const qrInfo = qrState[order._id];
              const qrDisplay = getQrDisplayData(qrInfo);
              const hasProof = Boolean(order.sellerQr?.proofImageUrl);
              const canSubmitProof = !hasProof || qrStatus === "rejected";

              return (
                <div key={order._id} style={S.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                    <div>
                      <div style={S.orderId}>Order #{order._id.slice(-8).toUpperCase()}</div>
                      <div style={S.infoText}>
                        Customer: {order.userId?.firstName || ""} {order.userId?.lastName || ""} ({order.userId?.email || "N/A"})
                      </div>
                      <div style={S.infoText}>
                        Date: {new Date(order.createdAt).toLocaleString()} | Total: ${Number(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <span style={{ ...S.badge, background: qrMeta.bg, color: qrMeta.color, border: `1px solid ${qrMeta.border}` }}>
                      🧾 {qrMeta.label}
                    </span>
                  </div>

                  {canSubmitProof ? (
                    <div style={S.section}>
                      <div style={S.sectionTitle}>Submit packing proof</div>
                      {qrStatus === "rejected" && hasProof ? (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ ...S.infoText, color: "#fca5a5" }}>
                            Previous proof was rejected. Upload a new proof image and corrected details.
                          </div>
                          {order.sellerQr?.verificationNote ? (
                            <div style={S.infoText}>Admin note: {order.sellerQr.verificationNote}</div>
                          ) : null}
                          <img src={order.sellerQr.proofImageUrl} alt="Previous rejected proof" style={S.proofImage} />
                        </div>
                      ) : null}
                      <div style={S.grid2}>
                        <input
                          type="text"
                          placeholder="Packed product name"
                          value={form.productName ?? (order.sellerQr?.packingProductName || "")}
                          onChange={(e) => setField(order._id, "productName", e.target.value)}
                          style={S.input}
                        />
                        <input
                          type="text"
                          placeholder="SKU or IMEI number"
                          value={form.skuOrImei ?? (order.sellerQr?.packingSkuOrImei || "")}
                          onChange={(e) => setField(order._id, "skuOrImei", e.target.value)}
                          style={S.input}
                        />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setField(order._id, "file", e.target.files?.[0] || null)}
                        style={S.fileInput}
                      />
                      <button
                        style={{ ...S.btn, ...S.btnPrimary, opacity: submittingOrderId === order._id ? 0.6 : 1 }}
                        disabled={submittingOrderId === order._id}
                        onClick={() => handleSubmitProof(order)}
                      >
                        {submittingOrderId === order._id
                          ? "Submitting..."
                          : qrStatus === "rejected"
                            ? "Resubmit proof to admin"
                            : "Send proof to admin"}
                      </button>
                    </div>
                  ) : (
                    <div style={S.section}>
                      <div style={S.sectionTitle}>Submitted proof</div>
                      <div style={S.infoText}>
                        Packed product: <strong>{order.sellerQr?.packingProductName || "N/A"}</strong> | SKU/IMEI: <strong>{order.sellerQr?.packingSkuOrImei || "N/A"}</strong>
                      </div>
                      <div style={S.infoText}>
                        Submitted: {order.sellerQr?.proofSubmittedAt ? new Date(order.sellerQr.proofSubmittedAt).toLocaleString() : "N/A"}
                      </div>
                      {order.sellerQr?.verificationNote ? (
                        <div style={{ ...S.infoText, color: "#f8fafc" }}>Admin note: {order.sellerQr.verificationNote}</div>
                      ) : null}
                      <img src={order.sellerQr.proofImageUrl} alt="Packing proof" style={S.proofImage} />
                    </div>
                  )}

                  {qrStatus === "approved" ? (
                    <div style={S.section}>
                      <div style={S.sectionTitle}>Generate seller QR</div>
                      <button
                        style={{ ...S.btn, ...S.btnPrimary, opacity: qrLoadingOrderId === order._id ? 0.6 : 1 }}
                        disabled={qrLoadingOrderId === order._id}
                        onClick={() => handleGenerateQr(order._id)}
                      >
                        {qrLoadingOrderId === order._id ? "Generating..." : "Generate / Refresh QR"}
                      </button>

                      {qrInfo?.qrImageDataUrl ? (
                        <div style={{ marginTop: 12 }}>
                          <img src={qrInfo.qrImageDataUrl} alt="Seller QR" style={S.qrImage} />
                          <div style={S.infoText}>Order ID: {qrDisplay.orderId}</div>
                          <div style={S.infoText}>Customer: {qrDisplay.customerName}</div>
                          <div style={S.infoText}>Address: {qrDisplay.address}</div>
                          <div style={S.infoText}>Location: {qrDisplay.locationText}</div>
                          {qrDisplay.qrText ? (
                            <pre style={S.qrTextPreview}>{qrDisplay.qrText}</pre>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  pg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
    color: "#fff",
    padding: "36px 20px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
  },
  wrap: {
    width: "100%",
    maxWidth: 1100,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#94a3b8",
    fontSize: 14,
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 16,
    backdropFilter: "blur(10px)",
  },
  orderId: {
    fontFamily: "monospace",
    color: "#c084fc",
    fontSize: 14,
    marginBottom: 4,
  },
  infoText: {
    color: "#cbd5e1",
    fontSize: 13,
    marginBottom: 4,
  },
  section: {
    marginTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#64748b",
    marginBottom: 10,
    fontWeight: 600,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 10,
  },
  input: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    padding: "9px 12px",
    color: "#e2e8f0",
    fontSize: 13,
    outline: "none",
  },
  fileInput: {
    color: "#cbd5e1",
    fontSize: 13,
    marginBottom: 10,
  },
  btn: {
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: "9px 14px",
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    background: "linear-gradient(to right, #006494, #0582ca)",
    border: "none",
  },
  btnGhost: {
    background: "rgba(255,255,255,0.06)",
  },
  badge: {
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },
  proofImage: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    marginTop: 8,
  },
  qrImage: {
    width: 290,
    maxWidth: "100%",
    background: "#fff",
    borderRadius: 0,
    padding: 8,
    marginBottom: 10,
    imageRendering: "pixelated",
  },
  qrTextPreview: {
    marginTop: 8,
    background: "rgba(15,23,42,0.65)",
    border: "1px solid rgba(148,163,184,0.35)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#e2e8f0",
    fontSize: 11,
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  empty: {
    width: "100%",
    maxWidth: 720,
    margin: "50px auto",
    textAlign: "center",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "30px 20px",
    color: "#94a3b8",
  },
};
