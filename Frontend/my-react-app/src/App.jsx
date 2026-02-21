import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";
import ProductListing from "./pages/ProductListing.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import SellerRegister from "./pages/SellerRegister";
import SellerDashboard from "./pages/SellerDashboard";
import Profile from "./pages/Profile";
import VerifySellerEmail from "./pages/VerifySellerEmail";
import Chatbot from "./components/Chatbot";

function App() {
  return (
    <Router>
      <Routes>
        {/* Home Page */}
        <Route path="/" element={<Home />} />

        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Browse Products Page */}
        <Route path="/products" element={<ProductListing />} />

        {/* Product Details Page */}
        <Route path="/products/:id" element={<ProductDetails />} />

        {/* Profile Page */}
        <Route path="/profile" element={<Profile />} />

        {/* Seller Registration Page */}
        <Route path="/become-seller" element={<SellerRegister />} />

        <Route path="/seller/dashboard" element={<SellerDashboard />} />

        {/* Email Verification for Seller Registration */}
        <Route path="/verify-seller-email" element={<VerifySellerEmail />} />


      </Routes>
      <Chatbot />
    </Router>
  );
}

export default App;
