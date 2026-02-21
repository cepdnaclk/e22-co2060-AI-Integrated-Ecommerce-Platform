import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ParticleCanvas from "../components/ParticleCanvas";

const API = "http://localhost:3000/api/users/profile";

const Profile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");

    // Edit modal state
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");

    // ----------- Fetch Profile -----------
    const fetchProfile = async () => {
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setProfile(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfile(); }, []);

    // ----------- Open Edit Modal -----------
    const openEdit = () => {
        setEditForm({
            firstName: profile?.firstName || "",
            lastName: profile?.lastName || "",
            phone: profile?.phone || "",
            dateOfBirth: profile?.dateOfBirth || "",
            gender: profile?.gender || "",
            address: profile?.address || "",
            bio: profile?.bio || "",
        });
        setSaveMsg("");
        setEditing(true);
    };

    // ----------- Save Profile -----------
    const handleSave = async () => {
        setSaving(true);
        setSaveMsg("");
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(API, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setProfile(data.user);
            setSaveMsg("✅ Profile updated successfully!");
            setTimeout(() => setEditing(false), 1200);
        } catch (err) {
            setSaveMsg("❌ " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ----------- Loading / Error -----------
    if (loading) {
        return (
            <div style={styles.pg}>
                <div style={styles.loader}>
                    <div style={styles.spin} />
                    <p style={{ color: "#94a3b8", marginTop: 16 }}>Loading profile…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.pg}>
                <div style={{ textAlign: "center" }}>
                    <p style={{ color: "#f87171", marginBottom: 16 }}>{error}</p>
                    <button style={styles.btnBlue} onClick={() => navigate("/login")}>Go to Login</button>
                </div>
            </div>
        );
    }

    const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "User";
    const avatarUrl = profile.image && !profile.image.startsWith("/images")
        ? profile.image
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff&size=200`;

    const tabs = ["overview", "personal", "security"];

    return (
        <div style={{ ...styles.pg, position: "relative", overflow: "hidden" }}>

            {/* ── GLOWING PARTICLES ── */}
            <ParticleCanvas />

            {/* ── ANIMATED BACKGROUND LAYER ── */}
            {/* Floating blob 1 — top left */}
            <div style={{
                position: "fixed", width: 500, height: 500, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,100,148,0.22) 0%, transparent 70%)",
                top: -180, left: -180, pointerEvents: "none", zIndex: 0,
                animation: "float1 8s ease-in-out infinite",
            }} />
            {/* Floating blob 2 — bottom right */}
            <div style={{
                position: "fixed", width: 420, height: 420, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
                bottom: -150, right: -120, pointerEvents: "none", zIndex: 0,
                animation: "float2 10s ease-in-out infinite",
            }} />
            {/* Floating blob 3 — center */}
            <div style={{
                position: "fixed", width: 300, height: 300, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(4,200,180,0.10) 0%, transparent 70%)",
                top: "40%", left: "50%", marginLeft: -150, marginTop: -150,
                pointerEvents: "none", zIndex: 0,
                animation: "float3 12s ease-in-out infinite",
            }} />

            <style>{`
                @keyframes fadeIn   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin     { to{transform:rotate(360deg)} }
                @keyframes float1   { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,30px) scale(1.05)} 66%{transform:translate(-20px,50px) scale(0.97)} }
                @keyframes float2   { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-50px,-30px) scale(1.08)} 70%{transform:translate(20px,-50px) scale(0.95)} }
                @keyframes float3   { 0%,100%{transform:scale(1) rotate(0deg)} 50%{transform:scale(1.15) rotate(180deg)} }
                @keyframes glowPulse{ 0%,100%{opacity:.7} 50%{opacity:1} }
                @keyframes avatarSpin { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

                .ptab { padding:8px 20px; border:none; border-radius:9999px; cursor:pointer; font-size:14px; font-weight:500; transition:all .25s; }
                .ptab:hover { background:rgba(255,255,255,0.1); color:#fff; transform:translateY(-1px); }
                .ptab-active { background:linear-gradient(to right,#006494,#0582ca); color:#fff !important; box-shadow:0 4px 20px rgba(5,130,202,0.35); }
                .pfield { width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; color:#fff; font-size:14px; outline:none; transition:border .2s, box-shadow .2s; box-sizing:border-box; }
                .pfield:focus { border-color:#0582ca; box-shadow:0 0 0 3px rgba(5,130,202,0.2); }
                select.pfield option { background:#0d1b2e; color:#fff; }
                .prow { display:flex; flex-direction:column; gap:4px; }
                .plabel { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
                .pval { font-size:15px; color:#e2e8f0; }
                .pbadge { display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:9999px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
                .pcard-hover { transition: transform .25s ease, box-shadow .25s ease; }
                .pcard-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(5,130,202,0.2) !important; }
                .stat-card { transition:transform .2s ease, background .2s ease; }
                .stat-card:hover { transform:translateY(-4px) scale(1.04); background:rgba(5,130,202,0.15) !important; }
                .avatar-ring {
                    background-size: 200% 200%;
                    animation: avatarSpin 4s linear infinite;
                    background-image: linear-gradient(45deg, #006494, #0582ca, #a855f7, #06b6d4, #0582ca, #006494);
                }
            `}</style>


            <div style={{ width: "100%", maxWidth: 900, animation: "fadeIn .5s ease", position: "relative", zIndex: 1 }}>

                {/* ── TOP BAR ── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 700 }}>My Account</h1>
                    <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        ← Back
                    </button>
                </div>

                {/* ── PROFILE HERO CARD ── */}
                <div className="pcard-hover" style={{ ...styles.card, display: "flex", gap: 32, alignItems: "flex-start", marginBottom: 24 }}>
                    {/* Avatar */}
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <div className="avatar-ring" style={{ width: 116, height: 116, borderRadius: "50%", padding: 3, flexShrink: 0 }}>
                            <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "3px solid #0a192f" }} />
                        </div>
                        <button onClick={openEdit} style={{ ...styles.btnBlue, padding: "7px 18px", fontSize: 13 }}>
                            ✏️ Edit Profile
                        </button>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{fullName}</h2>
                            <span className="pbadge" style={profile.role === "seller"
                                ? { background: "rgba(34,197,94,.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,.3)" }
                                : { background: "rgba(59,130,246,.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,.3)" }}>
                                {profile.role === "seller" ? "🏪 Seller" : "🛒 Customer"}
                            </span>
                            {profile.isEmailVerified && (
                                <span className="pbadge" style={{ background: "rgba(34,197,94,.1)", color: "#86efac", border: "1px solid rgba(34,197,94,.2)" }}>
                                    ✔ Verified
                                </span>
                            )}
                        </div>

                        {profile.bio && <p style={{ color: "#94a3b8", marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>}

                        <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
                            {profile.phone && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 13 }}>
                                    📞 {profile.phone}
                                </div>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 13 }}>
                                ✉️ {profile.email}
                            </div>
                            {profile.address && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#94a3b8", fontSize: 13 }}>
                                    📍 {profile.address}
                                </div>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                            <div className="stat-card" style={{ textAlign: "center", padding: "10px 20px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: "#4ac6ff" }}>0</div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Orders</div>
                            </div>
                            <div className="stat-card" style={{ textAlign: "center", padding: "10px 20px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: "#4ac6ff" }}>0</div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Wishlist</div>
                            </div>
                            <div style={{ textAlign: "center", padding: "10px 20px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: "#4ac6ff" }}>
                                    {profile.createdAt ? Math.floor((Date.now() - new Date(profile.createdAt)) / (1000 * 60 * 60 * 24)) : 0}
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Days Active</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TABS ── */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {tabs.map(t => (
                        <button key={t} className={`ptab ${activeTab === t ? "ptab-active" : ""}`}
                            style={{ color: activeTab === t ? "#fff" : "#94a3b8", background: activeTab === t ? undefined : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            onClick={() => setActiveTab(t)}>
                            {t === "overview" ? "📋 Overview" : t === "personal" ? "👤 Personal Details" : "🔒 Security"}
                        </button>
                    ))}
                </div>

                {/* ── TAB CONTENT ── */}
                <div style={styles.card}>

                    {/* OVERVIEW */}
                    {activeTab === "overview" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                            <div className="prow">
                                <span className="plabel">First Name</span>
                                <span className="pval">{profile.firstName || "—"}</span>
                            </div>
                            <div className="prow">
                                <span className="plabel">Last Name</span>
                                <span className="pval">{profile.lastName || "—"}</span>
                            </div>
                            <div className="prow">
                                <span className="plabel">Email</span>
                                <span className="pval">{profile.email}</span>
                            </div>
                            <div className="prow">
                                <span className="plabel">Phone</span>
                                <span className="pval">{profile.phone || "—"}</span>
                            </div>
                            <div className="prow">
                                <span className="plabel">Gender</span>
                                <span className="pval" style={{ textTransform: "capitalize" }}>{profile.gender || "—"}</span>
                            </div>
                            <div className="prow">
                                <span className="plabel">Date of Birth</span>
                                <span className="pval">{profile.dateOfBirth || "—"}</span>
                            </div>
                            <div className="prow" style={{ gridColumn: "1 / -1" }}>
                                <span className="plabel">Address</span>
                                <span className="pval">{profile.address || "—"}</span>
                            </div>
                            <div className="prow" style={{ gridColumn: "1 / -1" }}>
                                <span className="plabel">Bio</span>
                                <span className="pval">{profile.bio || "—"}</span>
                            </div>
                            <div className="prow">
                                <span className="plabel">Account Status</span>
                                <span className="pval" style={{ color: profile.isBlocked ? "#f87171" : "#4ade80" }}>
                                    {profile.isBlocked ? "Blocked" : "Active"}
                                </span>
                            </div>
                            <div className="prow">
                                <span className="plabel">Member Since</span>
                                <span className="pval">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span>
                            </div>
                        </div>
                    )}

                    {/* PERSONAL */}
                    {activeTab === "personal" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: 17, color: "#e2e8f0" }}>Personal Information</h3>
                                <button onClick={openEdit} style={{ ...styles.btnBlue, padding: "8px 16px", fontSize: 13 }}>
                                    ✏️ Edit
                                </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                                {[
                                    { label: "First Name", val: profile.firstName },
                                    { label: "Last Name", val: profile.lastName },
                                    { label: "Email Address", val: profile.email },
                                    { label: "Phone Number", val: profile.phone },
                                    { label: "Date of Birth", val: profile.dateOfBirth },
                                    { label: "Gender", val: profile.gender },
                                ].map(({ label, val }) => (
                                    <div key={label} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                                        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{label}</div>
                                        <div style={{ fontSize: 15, color: "#e2e8f0", textTransform: "capitalize" }}>{val || "Not provided"}</div>
                                    </div>
                                ))}
                                <div style={{ gridColumn: "1 / -1", padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Address</div>
                                    <div style={{ fontSize: 15, color: "#e2e8f0" }}>{profile.address || "Not provided"}</div>
                                </div>
                                <div style={{ gridColumn: "1 / -1", padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Bio</div>
                                    <div style={{ fontSize: 15, color: "#e2e8f0" }}>{profile.bio || "Not provided"}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECURITY */}
                    {activeTab === "security" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 17, color: "#e2e8f0" }}>Security Settings</h3>

                            {[
                                {
                                    icon: "✉️", title: "Email Address", sub: profile.email,
                                    badge: profile.isEmailVerified
                                        ? { text: "Verified", color: "#4ade80", bg: "rgba(34,197,94,.1)", border: "rgba(34,197,94,.25)" }
                                        : { text: "Not Verified", color: "#fbbf24", bg: "rgba(251,191,36,.1)", border: "rgba(251,191,36,.25)" },
                                },
                                {
                                    icon: "🔑", title: "Password", sub: "Managed via Firebase Authentication", badge: null,
                                },
                                {
                                    icon: "🛡️", title: "Account Status", sub: "Your account access level",
                                    badge: profile.isBlocked
                                        ? { text: "Blocked", color: "#f87171", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.25)" }
                                        : { text: "Active", color: "#4ade80", bg: "rgba(34,197,94,.1)", border: "rgba(34,197,94,.25)" },
                                },
                                {
                                    icon: "🕐", title: "Last Updated", sub: profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "—", badge: null,
                                },
                            ].map(({ icon, title, sub, badge }) => (
                                <div key={title} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        <span style={{ fontSize: 22 }}>{icon}</span>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{title}</div>
                                            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{sub}</div>
                                        </div>
                                    </div>
                                    {badge && (
                                        <span className="pbadge" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                                            {badge.text}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>

            {/* ── EDIT MODAL ── */}
            {editing && (
                <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setEditing(false); }}>
                    <div style={styles.modal}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Edit Profile</h2>
                            <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            {[
                                { key: "firstName", label: "First Name", type: "text" },
                                { key: "lastName", label: "Last Name", type: "text" },
                                { key: "phone", label: "Phone Number", type: "tel" },
                                { key: "dateOfBirth", label: "Date of Birth", type: "date" },
                            ].map(({ key, label, type }) => (
                                <div key={key}>
                                    <label className="plabel" style={{ display: "block", marginBottom: 6 }}>{label}</label>
                                    <input
                                        type={type} className="pfield"
                                        value={editForm[key] || ""}
                                        onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                                    />
                                </div>
                            ))}

                            <div>
                                <label className="plabel" style={{ display: "block", marginBottom: 6 }}>Gender</label>
                                <select className="pfield" value={editForm.gender || ""} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                                    <option value="">Prefer not to say</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <label className="plabel" style={{ display: "block", marginBottom: 6 }}>Address</label>
                                <input type="text" className="pfield" value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Street, City, Country" />
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <label className="plabel" style={{ display: "block", marginBottom: 6 }}>Bio</label>
                                <textarea className="pfield" rows={3} style={{ resize: "vertical" }} value={editForm.bio || ""} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell us a bit about yourself…" />
                            </div>
                        </div>

                        {saveMsg && (
                            <p style={{ marginTop: 14, fontSize: 14, color: saveMsg.startsWith("✅") ? "#4ade80" : "#f87171" }}>{saveMsg}</p>
                        )}

                        <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                            <button onClick={() => setEditing(false)} style={{ padding: "10px 22px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{ ...styles.btnBlue, padding: "10px 24px", opacity: saving ? 0.7 : 1 }}>
                                {saving ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spinner keyframe */}
            <style>{`@keyframes _spin { to { transform:rotate(360deg); } }`}</style>
        </div>
    );
};

const styles = {
    pg: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "48px 24px",
    },
    card: {
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 18,
        padding: 28,
        marginBottom: 4,
    },
    btnBlue: {
        background: "linear-gradient(to right, #006494, #0582ca)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 22px",
    },
    loader: {
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh",
    },
    spin: {
        width: 44, height: 44,
        border: "4px solid rgba(255,255,255,0.1)",
        borderTop: "4px solid #4ac6ff",
        borderRadius: "50%",
        animation: "_spin 1s linear infinite",
    },
    overlay: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
        padding: 20,
    },
    modal: {
        background: "linear-gradient(135deg, #0d1b2e, #0f2a44)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        padding: 32,
        width: "100%",
        maxWidth: 560,
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 25px 80px rgba(0,0,0,0.5)",
    },
};

export default Profile;
