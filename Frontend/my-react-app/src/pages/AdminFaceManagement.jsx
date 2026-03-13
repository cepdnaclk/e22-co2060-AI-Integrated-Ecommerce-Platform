import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import ParticleCanvas from "../components/ParticleCanvas";

export default function AdminFaceManagement() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  // Add Admin modal state
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [addingAdmin, setAddingAdmin] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const isCEO = adminUser.role === "ceo";

  const apiFetch = useCallback(
    async (url, opts = {}) => {
      const res = await fetch(`${API_BASE_URL}${url}`, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...opts.headers,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      return data;
    },
    [token]
  );

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/admin/auth/admins");
      setAdmins(data.admins || []);
      setFaceEnabled(data.faceRecognitionEnabled);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Camera controls
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err) {
      showToast("Camera access denied. Please allow camera permissions.", "error");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 640, 480);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  // Select admin for face registration (CEO only)
  const handleSelectAdmin = (admin) => {
    if (!isCEO) return;
    if (selectedAdmin?.id === admin.id) {
      setSelectedAdmin(null);
      stopCamera();
      return;
    }
    setSelectedAdmin(admin);
    setTimeout(() => startCamera(), 100);
  };

  // Register face (CEO only)
  const handleRegisterFace = async () => {
    if (!selectedAdmin || !isCEO) return;
    setProcessing(true);

    try {
      const faceImage = captureFrame();
      if (!faceImage) throw new Error("Failed to capture image");

      await apiFetch(`/api/admin/auth/register-face/${selectedAdmin.id}`, {
        method: "POST",
        body: JSON.stringify({ faceImage }),
      });

      showToast(`Face registered for ${selectedAdmin.firstName || selectedAdmin.email}`);
      stopCamera();
      setSelectedAdmin(null);
      fetchAdmins();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  // Remove face (CEO only)
  const handleRemoveFace = async (admin) => {
    if (!isCEO) return;
    if (!confirm(`Remove face data for ${admin.firstName || admin.email}?`)) return;

    try {
      await apiFetch(`/api/admin/auth/remove-face/${admin.id}`, {
        method: "DELETE",
      });
      showToast(`Face removed for ${admin.firstName || admin.email}`);
      fetchAdmins();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Remove admin (CEO only)
  const handleRemoveAdmin = async (admin) => {
    if (!isCEO) return;
    if (admin.role === "ceo") {
      showToast("Cannot remove CEO account", "error");
      return;
    }
    if (!confirm(`Remove admin account for ${admin.firstName || admin.email}? This cannot be undone.`)) return;

    try {
      await apiFetch(`/api/admin/auth/remove-admin/${admin.id}`, {
        method: "DELETE",
      });
      showToast(`Admin ${admin.firstName || admin.email} removed`);
      fetchAdmins();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Add Admin (CEO only)
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!isCEO) return;
    setAddingAdmin(true);

    try {
      await apiFetch("/api/admin/auth/create", {
        method: "POST",
        body: JSON.stringify(newAdmin),
      });
      showToast(`Admin ${newAdmin.firstName} created successfully`);
      setShowAddAdmin(false);
      setNewAdmin({ firstName: "", lastName: "", email: "", password: "" });
      fetchAdmins();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAddingAdmin(false);
    }
  };

  // Cancel selection
  const handleCancel = () => {
    setSelectedAdmin(null);
    stopCamera();
  };

  return (
    <div style={S.page}>
      <ParticleCanvas />

      <div style={S.bgCircle} />

      {/* Toast */}
      {toast && (
        <div
          style={{
            ...S.toast,
            background: toast.type === "error"
              ? "rgba(220,38,38,0.95)"
              : "rgba(22,163,74,0.95)",
          }}
        >
          {toast.type === "error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && isCEO && (
        <div style={S.modalOverlay} onClick={() => setShowAddAdmin(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#fff", margin: "0 0 20px 0", fontSize: 18 }}>
              ➕ Add New Admin
            </h3>
            <form onSubmit={handleAddAdmin}>
              <div style={S.formGroup}>
                <label style={S.label}>First Name *</label>
                <input
                  style={S.input}
                  type="text"
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                  required
                  placeholder="Enter first name"
                />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Last Name</label>
                <input
                  style={S.input}
                  type="text"
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Email *</label>
                <input
                  style={S.input}
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                  placeholder="admin@example.com"
                />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Password *</label>
                <input
                  style={S.input}
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <p style={{ color: "#94a3b8", fontSize: 12, margin: "8px 0 16px" }}>
                After creating the admin, register their face below to enable face-verified login.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={addingAdmin}
                  style={{
                    ...S.btnPurple,
                    flex: 1,
                    opacity: addingAdmin ? 0.6 : 1,
                    cursor: addingAdmin ? "not-allowed" : "pointer",
                  }}
                >
                  {addingAdmin ? "⏳ Creating..." : "✅ Create Admin"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAdmin(false)}
                  style={{ ...S.btnGray, padding: "12px 24px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={S.container}>
        <style>{`
          @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          .fm-card { animation: fadeIn 0.4s ease forwards; transition: transform 0.2s, box-shadow 0.2s; }
          .fm-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(168,85,247,0.12); }
        `}</style>

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>🔐</span>
              <h1 style={S.title}>Face Recognition Management</h1>
            </div>
            <p style={S.subtitle}>
              {isCEO
                ? "Register and manage face authentication for all admin users."
                : "View admin users and face enrollment status."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {isCEO && (
              <button onClick={() => setShowAddAdmin(true)} style={S.btnPurple}>
                ➕ Add Admin
              </button>
            )}
            <button onClick={() => navigate("/admin/dashboard")} style={S.btnGray}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Role Banner */}
        {!isCEO && (
          <div
            style={{
              ...S.statusBanner,
              background: "rgba(234,179,8,0.1)",
              borderColor: "rgba(234,179,8,0.3)",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <strong style={{ color: "#facc15" }}>View Only</strong>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
                Only the CEO can add admins, register faces, and remove accounts.
              </p>
            </div>
          </div>
        )}

        {/* Status Banner */}
        <div
          style={{
            ...S.statusBanner,
            background: faceEnabled
              ? "rgba(22,163,74,0.1)"
              : "rgba(234,179,8,0.1)",
            borderColor: faceEnabled
              ? "rgba(22,163,74,0.3)"
              : "rgba(234,179,8,0.3)",
          }}
        >
          <span style={{ fontSize: 20 }}>{faceEnabled ? "🟢" : "🟡"}</span>
          <div>
            <strong style={{ color: faceEnabled ? "#4ade80" : "#facc15" }}>
              Face Recognition: {faceEnabled ? "ENABLED" : "DISABLED"}
            </strong>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
              {faceEnabled
                ? "All admins must verify their face during login."
                : "Face verification is currently disabled. Enable FACE_RECOGNITION_ENABLED in .env to activate."}
            </p>
          </div>
        </div>

        {/* Camera Section (when admin selected — CEO only) */}
        {selectedAdmin && isCEO && (
          <div style={S.cameraSection}>
            <div style={S.cameraSectionHeader}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>
                📸 Registering face for:{" "}
                <span style={{ color: "#c084fc" }}>
                  {selectedAdmin.firstName} {selectedAdmin.lastName || ""} ({selectedAdmin.email})
                </span>
              </h3>
              <button onClick={handleCancel} style={S.btnSmallGray}>✕ Cancel</button>
            </div>

            <p style={{ color: "#94a3b8", fontSize: 13, margin: "8px 0 16px" }}>
              Have the admin stand in front of the camera. Ensure their face is well-lit and centered, then click "Register Face".
            </p>

            <div style={S.cameraContainer}>
              <video
                ref={videoRef}
                style={S.video}
                autoPlay
                playsInline
                muted
              />
              {!cameraReady && (
                <div style={S.cameraOverlay}>Starting camera...</div>
              )}
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={handleRegisterFace}
                disabled={!cameraReady || processing}
                style={{
                  ...S.btnPurple,
                  flex: 1,
                  opacity: !cameraReady || processing ? 0.6 : 1,
                  cursor: !cameraReady || processing ? "not-allowed" : "pointer",
                }}
              >
                {processing ? "⏳ Processing..." : "📸 Register Face"}
              </button>
              <button onClick={handleCancel} style={{ ...S.btnGray, padding: "12px 24px" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Admin List */}
        <h2 style={{ color: "#fff", fontSize: 18, marginTop: 32, marginBottom: 16 }}>
          👥 Admin Users ({admins.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Loading admins...</div>
        ) : admins.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>No admin users found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="fm-card"
                style={{
                  ...S.adminCard,
                  borderColor:
                    selectedAdmin?.id === admin.id
                      ? "rgba(168,85,247,0.5)"
                      : "rgba(255,255,255,0.08)",
                }}
              >
                <div style={S.adminInfo}>
                  <div style={S.avatar}>
                    {admin.image ? (
                      <img
                        src={admin.image}
                        alt=""
                        style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: 24 }}>👤</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                        {admin.firstName} {admin.lastName || ""}
                      </span>
                      {/* Role badge */}
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 700,
                        background: admin.role === "ceo" ? "rgba(234,179,8,0.15)" : "rgba(168,85,247,0.15)",
                        color: admin.role === "ceo" ? "#facc15" : "#c084fc",
                        border: admin.role === "ceo" ? "1px solid rgba(234,179,8,0.3)" : "1px solid rgba(168,85,247,0.3)",
                      }}>
                        {admin.role === "ceo" ? "👑 CEO" : "ADMIN"}
                      </span>
                      {admin.isBlocked && (
                        <span style={S.badgeRed}>Blocked</span>
                      )}
                    </div>
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>{admin.email}</span>
                  </div>
                </div>

                <div style={S.adminActions}>
                  {/* Face status badge */}
                  <span
                    style={{
                      ...S.badge,
                      background: admin.faceEnrolled
                        ? "rgba(22,163,74,0.15)"
                        : "rgba(234,179,8,0.15)",
                      color: admin.faceEnrolled ? "#4ade80" : "#facc15",
                      borderColor: admin.faceEnrolled
                        ? "rgba(22,163,74,0.3)"
                        : "rgba(234,179,8,0.3)",
                    }}
                  >
                    {admin.faceEnrolled ? "✅ Face Enrolled" : "⚠️ No Face"}
                  </span>

                  {/* CEO-only actions */}
                  {isCEO && (
                    <>
                      {/* Register / Update face */}
                      <button
                        onClick={() => handleSelectAdmin(admin)}
                        style={{
                          ...S.btnSmallPurple,
                          background:
                            selectedAdmin?.id === admin.id
                              ? "rgba(168,85,247,0.3)"
                              : "rgba(168,85,247,0.15)",
                        }}
                        disabled={!faceEnabled}
                        title={!faceEnabled ? "Face recognition is disabled" : ""}
                      >
                        {selectedAdmin?.id === admin.id
                          ? "📷 Scanning..."
                          : admin.faceEnrolled
                          ? "🔄 Update Face"
                          : "📸 Register Face"}
                      </button>

                      {/* Remove face */}
                      {admin.faceEnrolled && (
                        <button
                          onClick={() => handleRemoveFace(admin)}
                          style={S.btnSmallRed}
                        >
                          🗑️ Remove Face
                        </button>
                      )}

                      {/* Remove admin (cannot remove CEO) */}
                      {admin.role !== "ceo" && (
                        <button
                          onClick={() => handleRemoveAdmin(admin)}
                          style={{ ...S.btnSmallRed, background: "rgba(220,38,38,0.2)" }}
                        >
                          ❌ Remove Admin
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
    padding: "40px 24px",
    position: "relative",
    overflow: "hidden",
  },
  bgCircle: {
    position: "fixed",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
    top: -100,
    right: -100,
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    width: "100%",
    maxWidth: 900,
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    background: "linear-gradient(to right, #fff, #c084fc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: { color: "#94a3b8", fontSize: 14, margin: 0 },
  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px 20px",
    borderRadius: 12,
    border: "1px solid",
    marginBottom: 8,
  },
  cameraSection: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(168,85,247,0.3)",
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
  },
  cameraSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cameraContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    background: "#000",
    maxWidth: 480,
    margin: "0 auto",
  },
  video: {
    width: "100%",
    display: "block",
    transform: "scaleX(-1)",
  },
  cameraOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.8)",
    color: "#94a3b8",
    fontSize: 14,
  },
  adminCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid",
    borderRadius: 12,
    padding: "16px 20px",
    flexWrap: "wrap",
    gap: 12,
  },
  adminInfo: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flex: 1,
    minWidth: 200,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(168,85,247,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  adminActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  badge: {
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
    whiteSpace: "nowrap",
  },
  badgeRed: {
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    background: "rgba(220,38,38,0.15)",
    color: "#f87171",
    border: "1px solid rgba(220,38,38,0.3)",
  },
  toast: {
    position: "fixed",
    top: 24,
    right: 24,
    padding: "14px 24px",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    zIndex: 9999,
    boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
  },
  // Modal styles
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "linear-gradient(135deg, #1e1b4b, #0f172a)",
    border: "1px solid rgba(168,85,247,0.3)",
    borderRadius: 16,
    padding: "32px 28px",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  btnPurple: {
    background: "linear-gradient(to right, #7e22ce, #a855f7)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    padding: "12px 22px",
  },
  btnGray: {
    background: "rgba(255,255,255,0.05)",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    padding: "10px 20px",
  },
  btnSmallPurple: {
    color: "#c084fc",
    border: "1px solid rgba(168,85,247,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    padding: "6px 14px",
    whiteSpace: "nowrap",
  },
  btnSmallGray: {
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    padding: "6px 14px",
  },
  btnSmallRed: {
    background: "rgba(220,38,38,0.1)",
    color: "#f87171",
    border: "1px solid rgba(220,38,38,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    padding: "6px 14px",
    whiteSpace: "nowrap",
  },
};
