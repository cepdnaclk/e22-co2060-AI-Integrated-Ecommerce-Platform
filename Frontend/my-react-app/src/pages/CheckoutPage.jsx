import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCart } from "../services/cartService";
import { placeOrder } from "../services/orderService";
import GoogleMapAddressPicker from "../components/GoogleMapAddressPicker";
import API_BASE_URL from "../config/api";

/* ─── Breadcrumb Step Bar ─── */
function StepBar({ step }) {
  const steps = ["Cart", "Checkout", "Order Placed"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36, justifyContent: "center" }}>
      {steps.map((s, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? "#4ade80" : active ? "linear-gradient(to right,#006494,#0582ca)" : "rgba(255,255,255,0.07)",
                border: done ? "2px solid #4ade80" : active ? "2px solid #0582ca" : "2px solid rgba(255,255,255,0.12)",
                fontSize: 14, fontWeight: 700,
                color: done || active ? "#fff" : "#64748b",
                transition: "all 0.3s",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#4ac6ff" : done ? "#4ade80" : "#64748b", letterSpacing: "0.03em" }}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? "#4ade80" : "rgba(255,255,255,0.08)", margin: "0 8px", marginBottom: 20, minWidth: 60, maxWidth: 120, transition: "background 0.3s" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const S = {
    page: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
    },
    card: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        backdropFilter: "blur(10px)",
        padding: "28px 32px",
    },
    input: {
        width: "100%",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        color: "#fff",
        padding: "11px 14px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
    },
    label: {
        display: "block",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "#94a3b8",
        marginBottom: 6,
        fontWeight: 600,
    },
    btnBlue: {
        background: "linear-gradient(to right, #006494, #0582ca)",
        color: "#fff", border: "none", borderRadius: 10,
        cursor: "pointer", fontWeight: 700, fontSize: 15,
        padding: "13px 28px", transition: "opacity 0.2s", width: "100%",
    },
};

const EMPTY_ADDR = {
    fullName: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    deliveryInstructions: "",
};

const EMPTY_LOCATION = {
    lat: null,
    lng: null,
    placeId: "",
    provider: "",
    accuracy: null,
    timestamp: "",
    country: "",
    state: "",
    city: "",
    postalCode: "",
    street: "",
    formattedAddress: "",
    verified: false,
};

export default function CheckoutPage() {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_ADDR);
    const [errors, setErrors] = useState({});
    const [placing, setPlacing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [bookkeepingDelayed, setBookkeepingDelayed] = useState(false);
    const [toast, setToast] = useState(null);

    // Address source: "profile" = use saved address, "custom" = enter new one
    const [addressSource, setAddressSource] = useState("profile");
    const [profileAddress, setProfileAddress] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // Phone source: "profile" = use saved number, "other" = enter new one
    const [phoneSource, setPhoneSource] = useState("profile");
    const [otherPhone, setOtherPhone] = useState("");

    // Map location data for custom address
    const [mapLocation, setMapLocation] = useState(EMPTY_LOCATION);
    const [mapAddress, setMapAddress] = useState("");

    const token = localStorage.getItem("token");

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(async () => {
        setLoading(true);
        const data = await getCart(token);
        setCart(data);
        setLoading(false);
    }, [token]);

    // Fetch user profile to get saved address
    const fetchProfile = useCallback(async () => {
        setProfileLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();

            const hasAddress = data.address && data.address.trim();
            setProfileAddress({
                fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
                phone: data.phone || "",
                address: data.address || "",
                addressLocation: data.addressLocation || null,
            });

            // Pre-fill form with profile data
            if (hasAddress) {
                setForm({
                    fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
                    phone: data.phone || "",
                    street: data.address || "",
                    city: data.addressLocation?.city || "",
                    postalCode: data.addressLocation?.postalCode || "",
                    deliveryInstructions: "",
                });
                setAddressSource("profile");
            } else {
                setForm(prev => ({
                    ...prev,
                    fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
                    phone: data.phone || "",
                }));
                setAddressSource("custom");
            }
            setPhoneSource(data.phone ? "profile" : "other");
        } catch {
            setAddressSource("custom");
        } finally {
            setProfileLoading(false);
        }
    }, [token]);

    useEffect(() => { load(); fetchProfile(); }, [load, fetchProfile]);

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
        if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
    };

    // Switch address source
    const switchToProfile = () => {
        if (!profileAddress) return;
        setAddressSource("profile");
        setForm({
            fullName: profileAddress.fullName,
            phone: profileAddress.phone,
            street: profileAddress.address,
            city: profileAddress.addressLocation?.city || "",
            postalCode: profileAddress.addressLocation?.postalCode || "",
            deliveryInstructions: "",
        });
        setMapAddress("");
        setMapLocation(EMPTY_LOCATION);
        setErrors({});
    };

    const switchToCustom = () => {
        setAddressSource("custom");
        setForm(EMPTY_ADDR);
        setMapAddress("");
        setMapLocation(EMPTY_LOCATION);
        setErrors({});
    };

    // Handle map address selection for custom address
    const handleMapAddressChange = ({ address, addressLocation }) => {
        setMapAddress(address);
        setMapLocation({ ...EMPTY_LOCATION, ...(addressLocation || {}) });
        setForm((prev) => ({
            ...prev,
            street: address || prev.street,
            city: addressLocation?.city || prev.city,
            postalCode: addressLocation?.postalCode || prev.postalCode,
        }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next.street;
            if (addressLocation?.city) delete next.city;
            if (addressLocation?.postalCode) delete next.postalCode;
            return next;
        });
    };

    const applyLocationToShippingData = (shippingData, location) => {
        if (!location?.verified) return;

        shippingData.lat = location.lat ?? null;
        shippingData.lng = location.lng ?? null;
        shippingData.placeId = location.placeId || "";
        shippingData.provider = location.provider || "osm";
        shippingData.accuracy = Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null;
        shippingData.timestamp = location.timestamp || "";
        shippingData.country = location.country || "";
        shippingData.state = location.state || "";
        shippingData.city = shippingData.city || location.city || "";
        shippingData.postalCode = shippingData.postalCode || location.postalCode || "";
        shippingData.street = shippingData.street || location.street || "";
        shippingData.formattedAddress = location.formattedAddress || shippingData.street || "";
        shippingData.verified = true;
    };

    const validate = () => {
        const e = {};
        if (!form.fullName.trim()) e.fullName = "Required";

        // Phone validation based on source
        const activePhone = phoneSource === "profile" ? (profileAddress?.phone || "") : otherPhone;
        if (!activePhone.trim()) e.phone = "Required";

        if (addressSource === "profile") {
            // For profile address, street is the saved address
            if (!form.street.trim() && !profileAddress?.address) e.street = "No saved address";
        } else {
            if (!form.street.trim()) e.street = "Required";
        }
        if (!form.city.trim()) e.city = "Required";
        if (!form.postalCode.trim()) e.postalCode = "Required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handlePlaceOrder = async () => {
        if (!validate()) return;
        setPlacing(true);
        try {
            const activePhone = phoneSource === "profile" ? (profileAddress?.phone || "") : otherPhone;
            const shippingData = {
                ...form,
                phone: activePhone,
                deliveryInstructions: form.deliveryInstructions?.trim() || "",
            };

            if (addressSource === "profile" && profileAddress?.addressLocation?.verified) {
                applyLocationToShippingData(shippingData, profileAddress.addressLocation);
            } else if (addressSource === "custom" && mapLocation?.verified) {
                applyLocationToShippingData(shippingData, mapLocation);
            }
            const checkoutResult = await placeOrder(token, shippingData);
            setBookkeepingDelayed(Boolean(checkoutResult?.bookkeeping?.failedCount > 0));
            setSuccess(true);
            setTimeout(() => navigate("/orders"), 3500);
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setPlacing(false);
        }
    };

    const items = cart?.cart?.items || [];
    const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

    const hasProfileAddr = profileAddress?.address?.trim();
    const profileVerified = profileAddress?.addressLocation?.verified;

    // ─── Success Screen ───
    if (success) {
        return (
            <div style={{
                ...S.page,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease forwards" }}>
                    <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
                    <div style={{ fontSize: 80, animation: "bounce 1s ease infinite", marginBottom: 24 }}>✅</div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Order Placed!</h2>
                    <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 8 }}>
                        Thank you! Your order has been successfully placed.
                    </p>
                    <p style={{ color: "#64748b", fontSize: 13 }}>
                        Redirecting to your orders…
                    </p>
                    {bookkeepingDelayed ? (
                        <p style={{ color: "#facc15", fontSize: 13, marginTop: 8 }}>
                            Accounting sync is still processing. Refresh Admin Bookkeeping shortly.
                        </p>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div style={S.page} className="p-4 md:p-10">
            <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        .co-wrap{animation:fadeIn 0.4s ease forwards;max-width:960px;margin:0 auto;}
        .co-input:focus{border-color:#0582ca!important;box-shadow:0 0 0 3px rgba(5,130,202,0.15)!important;}
        .co-btn:hover{opacity:0.85;}
        .addr-option{cursor:pointer;border:2px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 18px;transition:all 0.2s;background:rgba(255,255,255,0.02);}
        .addr-option:hover{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);}
        .addr-option.active{border-color:#0582ca;background:rgba(5,130,202,0.08);}
      `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", top: 24, right: 24, zIndex: 9999,
                    background: toast.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${toast.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    borderRadius: 12, padding: "13px 20px",
                    color: toast.ok ? "#4ade80" : "#f87171",
                    fontWeight: 600, fontSize: 14, backdropFilter: "blur(12px)",
                    animation: "toastIn 0.3s ease forwards",
                }}>
                    {toast.msg}
                </div>
            )}

            <div className="co-wrap">
                {/* Progress Breadcrumb */}
                <StepBar step={1} />

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>💳 Checkout</h1>
                        <p style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>Complete your order</p>
                    </div>
                    <Link to="/cart" style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10, padding: "8px 18px", textDecoration: "none",
                        fontWeight: 600, fontSize: 13,
                    }}>← Back to Cart</Link>
                </div>

                {loading || profileLoading ? (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #4ac6ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                        <p style={{ color: "#64748b", fontSize: 14 }}>Loading…</p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-6 items-start">

                        {/* Left: Shipping Form */}
                        <div>
                            {/* ── Address Selection ── */}
                            <div style={S.card}>
                                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                                    📦 Shipping Address
                                </h2>
                                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
                                    Choose where to deliver your order
                                </p>

                                {/* Address options */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>

                                    {/* Option 1: Profile Address */}
                                    {hasProfileAddr && (
                                        <div
                                            className={`addr-option ${addressSource === "profile" ? "active" : ""}`}
                                            onClick={switchToProfile}
                                        >
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                                {/* Radio circle */}
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                                                    border: addressSource === "profile" ? "2px solid #0582ca" : "2px solid rgba(255,255,255,0.2)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    transition: "all 0.2s",
                                                }}>
                                                    {addressSource === "profile" && (
                                                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0582ca" }} />
                                                    )}
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                                                            🏠 Default Address
                                                        </span>
                                                        {profileVerified && (
                                                            <span style={{
                                                                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                                                                color: "#4ade80", background: "rgba(34,197,94,0.12)",
                                                                border: "1px solid rgba(34,197,94,0.25)",
                                                                borderRadius: 20, padding: "2px 8px",
                                                            }}>
                                                                ✓ Verified
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                                                        <div style={{ fontWeight: 600, color: "#cbd5e1" }}>{profileAddress.fullName}</div>
                                                        <div>{profileAddress.address}</div>
                                                        {profileAddress.phone && <div>📞 {profileAddress.phone}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Mini map preview for verified profile address */}
                                            {addressSource === "profile" && profileVerified && profileAddress?.addressLocation?.lat && (
                                                <div style={{ marginTop: 12, marginLeft: 32 }}>
                                                    <GoogleMapAddressPicker
                                                        address={profileAddress.address}
                                                        addressLocation={profileAddress.addressLocation}
                                                        readOnly={true}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Option 2: Different Address */}
                                    <div
                                        className={`addr-option ${addressSource === "custom" ? "active" : ""}`}
                                        onClick={() => { if (addressSource !== "custom") switchToCustom(); }}
                                    >
                                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                            {/* Radio circle */}
                                            <div style={{
                                                width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                                                border: addressSource === "custom" ? "2px solid #0582ca" : "2px solid rgba(255,255,255,0.2)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                transition: "all 0.2s",
                                            }}>
                                                {addressSource === "custom" && (
                                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0582ca" }} />
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                                                    📍 Ship to a Different Address
                                                </span>
                                                {!hasProfileAddr && (
                                                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, marginBottom: 0 }}>
                                                        No saved address found — enter your shipping address below
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Custom Address Form (shown when "custom" selected) ── */}
                                {addressSource === "custom" && (
                                    <div style={{ animation: "fadeIn 0.3s ease forwards" }}>
                                        {/* Location picker (OSM/Leaflet via provider abstraction) */}
                                        <div style={{ marginBottom: 20 }}>
                                            <label style={{ ...S.label, marginBottom: 10 }}>Search & Select Location on Map</label>
                                            <GoogleMapAddressPicker
                                                address={mapAddress}
                                                addressLocation={mapLocation}
                                                onAddressChange={handleMapAddressChange}
                                            />
                                        </div>

                                        {/* Name + Phone */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label style={S.label}>Full Name *</label>
                                                <input
                                                    className="co-input"
                                                    style={{ ...S.input, borderColor: errors.fullName ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                    value={form.fullName}
                                                    onChange={(e) => set("fullName", e.target.value)}
                                                    placeholder="John Doe"
                                                />
                                                {errors.fullName && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.fullName}</p>}
                                            </div>
                                            <div>
                                                <label style={S.label}>Phone Number *</label>
                                                <input
                                                    className="co-input"
                                                    style={{ ...S.input, borderColor: errors.phone ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                    value={form.phone}
                                                    onChange={(e) => set("phone", e.target.value)}
                                                    placeholder="+94 77 000 0000"
                                                />
                                                {errors.phone && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.phone}</p>}
                                            </div>
                                        </div>

                                        {/* Street Address */}
                                        <div style={{ marginBottom: 16 }}>
                                            <label style={S.label}>Street Address *</label>
                                            <input
                                                className="co-input"
                                                style={{ ...S.input, borderColor: errors.street ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                value={form.street}
                                                onChange={(e) => set("street", e.target.value)}
                                                placeholder="123 Main Street, Apt 4B"
                                            />
                                            {errors.street && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.street}</p>}
                                            {mapLocation?.verified && (
                                                <p style={{ fontSize: 11, color: "#4ade80", marginTop: 4 }}>✓ Auto-filled from map selection</p>
                                            )}
                                        </div>

                                        {/* City + Postal */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label style={S.label}>City *</label>
                                                <input
                                                    className="co-input"
                                                    style={{ ...S.input, borderColor: errors.city ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                    value={form.city}
                                                    onChange={(e) => set("city", e.target.value)}
                                                    placeholder="Colombo"
                                                />
                                                {errors.city && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.city}</p>}
                                            </div>
                                            <div>
                                                <label style={S.label}>Postal Code *</label>
                                                <input
                                                    className="co-input"
                                                    style={{ ...S.input, borderColor: errors.postalCode ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                    value={form.postalCode}
                                                    onChange={(e) => set("postalCode", e.target.value)}
                                                    placeholder="10001"
                                                />
                                                {errors.postalCode && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.postalCode}</p>}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 16 }}>
                                            <label style={S.label}>Delivery Instructions (Optional)</label>
                                            <textarea
                                                className="co-input"
                                                style={{ ...S.input, minHeight: 84, resize: "vertical" }}
                                                value={form.deliveryInstructions}
                                                onChange={(e) => set("deliveryInstructions", e.target.value)}
                                                placeholder="e.g., Leave package at the front desk / call before arrival"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* ── Profile address extra fields (city + postal still needed) ── */}
                                {addressSource === "profile" && hasProfileAddr && (
                                    <div style={{ animation: "fadeIn 0.3s ease forwards" }}>
                                        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0 16px" }} />
                                        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                                            Complete the remaining details for delivery:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label style={S.label}>City *</label>
                                                <input
                                                    className="co-input"
                                                    style={{ ...S.input, borderColor: errors.city ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                    value={form.city}
                                                    onChange={(e) => set("city", e.target.value)}
                                                    placeholder="Colombo"
                                                />
                                                {errors.city && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.city}</p>}
                                            </div>
                                            <div>
                                                <label style={S.label}>Postal Code *</label>
                                                <input
                                                    className="co-input"
                                                    style={{ ...S.input, borderColor: errors.postalCode ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                    value={form.postalCode}
                                                    onChange={(e) => set("postalCode", e.target.value)}
                                                    placeholder="10001"
                                                />
                                                {errors.postalCode && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.postalCode}</p>}
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 16 }}>
                                            <label style={S.label}>Delivery Instructions (Optional)</label>
                                            <textarea
                                                className="co-input"
                                                style={{ ...S.input, minHeight: 84, resize: "vertical" }}
                                                value={form.deliveryInstructions}
                                                onChange={(e) => set("deliveryInstructions", e.target.value)}
                                                placeholder="e.g., Gate code 1234, call on arrival"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Contact Number Section ── */}
                            <div style={{ ...S.card, marginTop: 16 }}>
                                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                                    📞 Contact Number
                                </h2>
                                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
                                    We'll call this number for delivery updates
                                </p>

                                {/* Phone options */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                                    {/* Option 1: Profile phone */}
                                    {profileAddress?.phone && (
                                        <div
                                            className={`addr-option ${phoneSource === "profile" ? "active" : ""}`}
                                            onClick={() => { setPhoneSource("profile"); setErrors(e => { const n = { ...e }; delete n.phone; return n; }); }}
                                            style={{ padding: "12px 16px" }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                                                    border: phoneSource === "profile" ? "2px solid #0582ca" : "2px solid rgba(255,255,255,0.2)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    transition: "all 0.2s",
                                                }}>
                                                    {phoneSource === "profile" && (
                                                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0582ca" }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                                                        {profileAddress.phone}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Saved number from your profile</div>
                                                </div>
                                                <span style={{ fontSize: 10, color: "#60a5fa", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>DEFAULT</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Option 2: Different number */}
                                    <div
                                        className={`addr-option ${phoneSource === "other" ? "active" : ""}`}
                                        onClick={() => { setPhoneSource("other"); }}
                                        style={{ padding: "12px 16px" }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{
                                                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                                                border: phoneSource === "other" ? "2px solid #0582ca" : "2px solid rgba(255,255,255,0.2)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                transition: "all 0.2s",
                                            }}>
                                                {phoneSource === "other" && (
                                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0582ca" }} />
                                                )}
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                                                Use a different number
                                            </span>
                                        </div>

                                        {/* Input for other phone */}
                                        {phoneSource === "other" && (
                                            <div style={{ marginTop: 12, marginLeft: 32, animation: "fadeIn 0.2s ease forwards" }}>
                                                <input
                                                    className="co-input"
                                                    style={{ ...S.input, borderColor: errors.phone ? "#f87171" : "rgba(255,255,255,0.12)" }}
                                                    value={otherPhone}
                                                    onChange={(e) => {
                                                        setOtherPhone(e.target.value);
                                                        if (errors.phone) setErrors(er => { const n = { ...er }; delete n.phone; return n; });
                                                    }}
                                                    placeholder="+94 77 000 0000"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                {errors.phone && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{errors.phone}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ ...S.card, position: "sticky", top: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Order Summary</h3>

                            {items.length === 0 ? (
                                <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Your cart is empty.</p>
                            ) : (
                                items.map((item) => {
                                    const product = item.productId || {};
                                    return (
                                        <div key={item.sellerOfferId?.toString()} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                                            <span style={{ color: "#94a3b8", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {product.productName || "Product"} ×{item.quantity}
                                            </span>
                                            <span style={{ fontWeight: 600 }}>Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                        </div>
                                    );
                                })
                            )}

                            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />

                            {/* Delivery address summary */}
                            <div style={{ marginBottom: 16, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontWeight: 600 }}>Delivering To</div>
                                <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>
                                    {addressSource === "profile" && hasProfileAddr ? (
                                        <>
                                            <div style={{ fontWeight: 600 }}>{profileAddress.fullName}</div>
                                            <div style={{ color: "#94a3b8" }}>{profileAddress.address}</div>
                                            {profileVerified && <span style={{ fontSize: 10, color: "#4ade80" }}>✓ Map Verified</span>}
                                        </>
                                    ) : form.street ? (
                                        <>
                                            <div style={{ fontWeight: 600 }}>{form.fullName || "—"}</div>
                                            <div style={{ color: "#94a3b8" }}>{form.street}</div>
                                            {form.city && <div style={{ color: "#94a3b8" }}>{form.city} {form.postalCode}</div>}
                                            {mapLocation?.verified && <span style={{ fontSize: 10, color: "#4ade80" }}>✓ Map Verified</span>}
                                        </>
                                    ) : (
                                        <span style={{ color: "#64748b" }}>No address selected</span>
                                    )}
                                    <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 12 }}>
                                        📞 {phoneSource === "profile" ? (profileAddress?.phone || "—") : (otherPhone || "—")}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                                <span style={{ color: "#94a3b8" }}>Shipping</span>
                                <span style={{ color: "#4ade80", fontWeight: 600 }}>Free</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                                <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
                                <span style={{ fontWeight: 800, fontSize: 18, color: "#4ade80" }}>
                                    Rs. {totalPrice.toLocaleString()}
                                </span>
                            </div>

                            <button
                                className="co-btn"
                                onClick={handlePlaceOrder}
                                disabled={placing || items.length === 0}
                                style={{
                                    ...S.btnBlue,
                                    opacity: placing || items.length === 0 ? 0.5 : 1,
                                    cursor: placing || items.length === 0 ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                }}
                            >
                                {placing ? (
                                    <>
                                        <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                                        Placing Order…
                                    </>
                                ) : "Place Order 🎉"}
                            </button>

                            <p style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#475569" }}>
                                🔒 Secure & encrypted payment
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
