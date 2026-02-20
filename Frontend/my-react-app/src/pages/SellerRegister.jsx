import { useState } from "react";
import { registerSeller } from "../services/sellerService";

const SellerRegister = () => {
  const [form, setForm] = useState({
    shopName: "",
    description: "",
    address: "",
    phone: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await registerSeller(form);
      setSuccess("Seller profile created successfully 🎉");
      console.log("Seller created:", res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Become a Seller
        </h1>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-100 p-2 rounded">
            {error}
          </p>
        )}

        {success && (
          <p className="mb-4 text-sm text-green-600 bg-green-100 p-2 rounded">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="shopName"
            placeholder="Shop Name"
            required
            value={form.shopName}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />

          <input
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />

          <input
            name="address"
            placeholder="Business Address"
            value={form.address}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />

          <input
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Creating..." : "Register as Seller"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SellerRegister;