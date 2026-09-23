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
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <h1 className="text-3xl font-black tracking-tight">Register Delivery Center</h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Create your delivery company and center account first, then sign in to the dashboard.
          </p>
        </div>

        <form className="space-y-6 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-md" onSubmit={onSubmit}>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm font-medium">{error}</div>}
          {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 text-sm font-medium">{success}</div>}

          {/* Section: Account */}
          <SectionTitle>Account Administrator</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First Name" value={form.firstName} onChange={onChange("firstName")} required />
            <Field label="Last Name" value={form.lastName} onChange={onChange("lastName")} required />
            <Field label="Email Address" type="email" value={form.email} onChange={onChange("email")} required />
            <Field label="Phone Number" value={form.phone} onChange={onChange("phone")} />
            <Field label="Password" type="password" value={form.password} onChange={onChange("password")} required />
            <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={onChange("confirmPassword")} required />
          </div>

          {/* Section: Company */}
          <SectionTitle>Company Details</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Field label="Company Name" value={form.companyName} onChange={onChange("companyName")} required />
            </div>
            <Field label="Reg. Number" value={form.registrationNumber} onChange={onChange("registrationNumber")} required />
            <div className="md:col-span-3">
              <Field label="Business License Number" value={form.businessLicenseNumber} onChange={onChange("businessLicenseNumber")} />
            </div>
          </div>

          {/* Section: Center */}
          <SectionTitle>Delivery Center Details</SectionTitle>
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Pick Location from Map</label>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <GoogleMapAddressPicker
                address={mapAddress || form.address}
                addressLocation={mapLocation}
                onAddressChange={handleMapAddressChange}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic uppercase tracking-wider">Selecting map location auto-fills address fields below.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Center Code" value={form.branchCode} onChange={onChange("branchCode")} required />
            <Field label="Center Name" value={form.branchName} onChange={onChange("branchName")} required />
            <Field label="District" value={form.district} onChange={onChange("district")} required />
            <Field label="City" value={form.city} onChange={onChange("city")} />
            <Field label="Province / State" value={form.province} onChange={onChange("province")} />
            <Field label="Postal Code" value={form.postalCode} onChange={onChange("postalCode")} />
            <div className="md:col-span-2">
              <Field label="Full Street Address" value={form.address} onChange={onChange("address")} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 pt-6 border-t border-white/10">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "REGISTERING..." : "CREATE CENTER ACCOUNT"}
            </button>
            <Link to="/dms/login" className="text-purple-400 hover:text-purple-300 font-bold text-sm transition-colors">
              Already registered? Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2 mb-4">
      {children}
    </h3>
  );
}

function Field({ label, type = "text", value, onChange, required = false }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-400">{label}</label>
      <input 
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder:text-slate-600" 
        type={type} 
        value={value} 
        onChange={onChange} 
        required={required} 
      />
    </div>
  );
}
