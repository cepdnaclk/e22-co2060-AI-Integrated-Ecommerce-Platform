import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";
import ProductListing from "./pages/ProductListing.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import SellerRegister from "./pages/SellerRegister";

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

          {/* Seller Registration Page */}
        <Route path="/become-seller" element={<SellerRegister />} />

        
      </Routes>
    </Router>
  );
}

export default App;
