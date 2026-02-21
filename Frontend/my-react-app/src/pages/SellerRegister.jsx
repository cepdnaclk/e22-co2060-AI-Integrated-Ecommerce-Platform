import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerSeller } from "../services/sellerService";
import "../components/successAnimation.css";
import "./sellerRegister.css";

const REDIRECT_DELAY = 5000; // ✅ 5 seconds

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
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await registerSeller(form);

      // ✅ Show success animation
      setSuccess(true);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ⏳ Redirect AFTER animation finishes
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      navigate("/seller/dashboard");
    }, REDIRECT_DELAY);

    return () => clearTimeout(timer);
  }, [success, navigate]);

  /* ================= SUCCESS SCREEN ================= */
  if (success) {
    return (
      <div className="success-container">
        <div className="checkmark-circle">
          <div className="checkmark"></div>
        </div>

        <h2 className="success-text">
          Seller registration successful 🎉
        </h2>

        <p className="redirect-text">
          Redirecting to dashboard in a few seconds…
        </p>
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

        {error && (
          <div className="seller-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="seller-form">

          <input
            name="shopName"
            placeholder="Seller / Business Name"
            onChange={handleChange}
            required
          />

          <input
            name="description"
            placeholder="Description"
            onChange={handleChange}
          />

          <input
            name="address"
            placeholder="Business Address"
            onChange={handleChange}
          />

          <input
            name="phone"
            placeholder="Phone Number"
            onChange={handleChange}
          />

          <button disabled={loading}>
            {loading ? "Registering..." : "Create Seller Account"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default BecomeSeller;