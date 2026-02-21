// src/pages/SellerDashboard.jsx
import { useEffect, useState } from "react";
import { getMySellerProfile } from "../services/sellerService";
import { Link } from "react-router-dom";
import "./sellerDashboard.css";

const SellerDashboard = () => {
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMySellerProfile()
      .then(setSeller)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="dashboard-bg">
        <div className="dashboard-glass error-box">
          {error}
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="dashboard-bg">
        <div className="loader">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="dashboard-bg">
      <div className="dashboard-container">

        {/* ===== HEADER ===== */}
        <div className="dashboard-header glass">
          <div>
            <h1>Seller Dashboard</h1>
            <p>Welcome back, <strong>{seller.shopName}</strong></p>
          </div>

          <span className={`status ${seller.verificationStatus}`}>
            {seller.verificationStatus}
          </span>
        </div>

        {/* ===== STATS ===== */}
        <div className="stats-grid">
          <div className="stat-card glass">
            <h3>Total Sales</h3>
            <p>$7,350</p>
          </div>

          <div className="stat-card glass">
            <h3>Orders</h3>
            <p>165</p>
          </div>

          <div className="stat-card glass">
            <h3>Products</h3>
            <p>42</p>
          </div>

          <div className="stat-card glass">
            <h3>Store Visits</h3>
            <p>15.2K</p>
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="actions glass">
          <Link to="/seller/offers" className="btn primary">
            My Offers
          </Link>

          <Link to="/seller/offers/new" className="btn secondary">
            Add New Offer
          </Link>
        </div>

      </div>
    </div>
  );
};

export default SellerDashboard;