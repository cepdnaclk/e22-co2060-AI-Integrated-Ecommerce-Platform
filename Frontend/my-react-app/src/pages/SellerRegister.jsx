import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerSeller } from "../services/sellerService";
import "../components/successAnimation.css"; // 👈 add css file

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

      // ✅ trigger success animation
      setSuccess(true);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ✅ auto redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate("/seller/dashboard");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  /* ===============================
     SUCCESS SCREEN
  =============================== */
  if (success) {
    return (
      <div className="success-container">
        <div className="checkmark-circle">
          <div className="checkmark"></div>
        </div>

        <h2 className="success-text">
          Seller registration successful!
        </h2>
        <p className="redirect-text">
          Redirecting to dashboard...
        </p>
      </div>
    );
  }

  /* ===============================
     FORM SCREEN
  =============================== */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-semibold">
          Become a Seller
        </h2>

        {error && (
          <p className="bg-red-100 text-red-600 p-2 rounded">
            {error}
          </p>
        )}

        <input
          name="shopName"
          placeholder="Shop Name"
          className="w-full border p-2 rounded"
          onChange={handleChange}
          required
        />

        <input
          name="description"
          placeholder="Description"
          className="w-full border p-2 rounded"
          onChange={handleChange}
        />

        <input
          name="address"
          placeholder="Address"
          className="w-full border p-2 rounded"
          onChange={handleChange}
        />

        <input
          name="phone"
          placeholder="Phone"
          className="w-full border p-2 rounded"
          onChange={handleChange}
        />

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Registering..." : "Register as Seller"}
        </button>
      </form>
    </div>
  );
};

export default BecomeSeller;