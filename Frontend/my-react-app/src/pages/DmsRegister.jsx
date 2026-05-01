import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleMapAddressPicker from "../components/GoogleMapAddressPicker";
import { dmsService } from "../services/dmsService";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  companyName: "",
  registrationNumber: "",
  businessLicenseNumber: "",
  branchCode: "",
  branchName: "",
  district: "",
  city: "",
  province: "",
  postalCode: "",
  address: "",
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

export default function DmsRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [mapAddress, setMapAddress] = useState("");
  const [mapLocation, setMapLocation] = useState(EMPTY_LOCATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleMapAddressChange = ({ address, addressLocation }) => {
    const location = { ...EMPTY_LOCATION, ...(addressLocation || {}) };
    const districtFromMap = location.state || location.city || "";
    const streetFromMap = address || location.formattedAddress || location.street || "";

    setMapAddress(streetFromMap);
    setMapLocation(location);
    setForm((prev) => ({
      ...prev,
      address: streetFromMap || prev.address,
      district: districtFromMap || prev.district,
      city: location.city || prev.city,
      province: location.state || prev.province,
      postalCode: location.postalCode || prev.postalCode,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Password confirmation does not match");
      return;
    }

    setLoading(true);
    try {
      await dmsService.registerCenterPortal({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        companyName: form.companyName,
        registrationNumber: form.registrationNumber,
        businessLicenseNumber: form.businessLicenseNumber,
        branchCode: form.branchCode,
        branchName: form.branchName,
        district: form.district,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        address: form.address,
        companyAddress: form.address,
        companyDistrict: form.district,
        companyCity: form.city,
        companyProvince: form.province,
        companyPostalCode: form.postalCode,
        branchAddress: form.address,
        branchDistrict: form.district,
        branchCity: form.city,
        branchProvince: form.province,
        branchPostalCode: form.postalCode,
      });

      setSuccess("Registration successful. Redirecting to sign in...");
      setTimeout(() => {
        navigate("/dms/login", {
          replace: true,
          state: {
            registrationSuccess: true,
            prefillEmail: form.email,
          },
        });
      }, 1000);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <h1 style={S.title}>Register Delivery Company Center</h1>
          <p style={S.subtitle}>
            Create your delivery company + center account first, then sign in to the center dashboard.
          </p>
        </div>

        <form style={S.form} onSubmit={onSubmit}>
          {error && <div style={S.error}>{error}</div>}
          {success && <div style={S.success}>{success}</div>}

          <div style={S.sectionTitle}>Account Details</div>
          <div style={S.grid}>
            <Field label="First Name" value={form.firstName} onChange={onChange("firstName")} required />
            <Field label="Last Name" value={form.lastName} onChange={onChange("lastName")} required />
            <Field label="Email" type="email" value={form.email} onChange={onChange("email")} required />
            <Field label="Phone" value={form.phone} onChange={onChange("phone")} />
            <Field label="Password" type="password" value={form.password} onChange={onChange("password")} required />
            <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={onChange("confirmPassword")} required />
          </div>

          <div style={S.sectionTitle}>Company Details</div>
          <div style={S.grid}>
            <Field label="Company Name" value={form.companyName} onChange={onChange("companyName")} required />
            <Field label="Registration Number" value={form.registrationNumber} onChange={onChange("registrationNumber")} required />
            <Field label="Business License No" value={form.businessLicenseNumber} onChange={onChange("businessLicenseNumber")} />
          </div>

          <div style={S.sectionTitle}>Delivery Center Details</div>
          <div style={S.mapWrap}>
            <label style={S.label}>Pick Address from Map (OpenStreetMap)</label>
            <GoogleMapAddressPicker
              address={mapAddress || form.address}
              addressLocation={mapLocation}
              onAddressChange={handleMapAddressChange}
            />
            <div style={S.mapHint}>
              Selecting a map location auto-fills district, city, province, postal code, and address.
            </div>
          </div>
          <div style={S.grid}>
            <Field label="Center Code" value={form.branchCode} onChange={onChange("branchCode")} required />
            <Field label="Center Name" value={form.branchName} onChange={onChange("branchName")} required />
            <Field label="District" value={form.district} onChange={onChange("district")} required />
            <Field label="City" value={form.city} onChange={onChange("city")} />
            <Field label="Province / State" value={form.province} onChange={onChange("province")} />
            <Field label="Postal Code" value={form.postalCode} onChange={onChange("postalCode")} />
            <Field label="Address" value={form.address} onChange={onChange("address")} />
          </div>

          <div style={S.actions}>
            <button type="submit" style={S.primaryBtn} disabled={loading}>
              {loading ? "Registering..." : "Register Center Account"}
            </button>
            <Link to="/dms/login" style={S.linkBtn}>Already registered? Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, required = false }) {
  return (
    <label style={S.field}>
      <span style={S.label}>{label}</span>
      <input style={S.input} type={type} value={value} onChange={onChange} required={required} />
    </label>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    padding: "28px 14px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  container: {
    maxWidth: 1000,
    margin: "0 auto",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#94a3b8",
  },
  form: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 18,
  },
  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 10,
    color: "#fca5a5",
    fontSize: 13,
    padding: "10px 12px",
    marginBottom: 12,
  },
  success: {
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.3)",
    borderRadius: 10,
    color: "#86efac",
    fontSize: 13,
    padding: "10px 12px",
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#cbd5e1",
  },
  mapWrap: {
    marginBottom: 12,
  },
  mapHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#94a3b8",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  label: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    boxSizing: "border-box",
    outline: "none",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  primaryBtn: {
    padding: "11px 14px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    color: "#fff",
    fontWeight: 800,
    background: "linear-gradient(to right, #7e22ce, #a855f7)",
    fontSize: 14,
  },
  linkBtn: {
    color: "#93c5fd",
    fontSize: 13,
    textDecoration: "none",
  },
};

