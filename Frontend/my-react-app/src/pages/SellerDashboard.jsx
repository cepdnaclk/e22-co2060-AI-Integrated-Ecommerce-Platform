import { useEffect, useState } from "react";
import { getMySellerProfile } from "../services/sellerService";
import { Link } from "react-router-dom";

const SellerDashboard = () => {
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMySellerProfile()
      .then(setSeller)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!seller) {
    return <p>Loading seller dashboard...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Seller Dashboard</h1>

      <div className="mt-4 bg-white p-4 rounded shadow">
        <p><strong>Shop:</strong> {seller.shopName}</p>
        <p><strong>Status:</strong> {seller.verificationStatus}</p>
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          to="/seller/offers"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          My Offers
        </Link>

        <Link
          to="/seller/offers/new"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add New Offer
        </Link>
      </div>
    </div>
  );
};

export default SellerDashboard;