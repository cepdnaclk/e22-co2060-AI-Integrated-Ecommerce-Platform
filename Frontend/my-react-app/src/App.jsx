import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";
import ProductListing from "./pages/ProductListing.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import SellerRegister from "./pages/SellerRegister";
import SellerDashboard from "./pages/SellerDashboard";
import SellerOrderQr from "./pages/SellerOrderQr";
import SellerRestock from "./pages/SellerRestock";
import Profile from "./pages/Profile";
import VerifySellerEmail from "./pages/VerifySellerEmail";
import CreateSellerOffer from "./pages/CreateSellerOffer";
import MySellerOffers from "./pages/MySellerOffers";
import SellerMarketingScheduler from "./pages/SellerMarketingScheduler";
import Chatbot from "./components/Chatbot";
import CartWidget from "./components/CartWidget";
import CreateProduct from "./pages/CreateProduct";
import AdminDashboard from "./pages/AdminDashboard";
import AdminInventory from "./pages/AdminInventory";
import AdminFaceManagement from "./pages/AdminFaceManagement";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminLogin from "./pages/AdminLogin";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminBookkeeping from "./pages/AdminBookkeeping";
import AdminDmsControlTower from "./pages/AdminDmsControlTower";
import DmsLogin from "./pages/DmsLogin";
import DmsRegister from "./pages/DmsRegister";
import DmsPortalHome from "./pages/DmsPortalHome";
import DmsCenterDashboard from "./pages/DmsCenterDashboard";
import DmsQrScanner from "./pages/DmsQrScanner"; // DMS QR scanner route
import DmsProtectedRoute from "./components/DmsProtectedRoute";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderHistory from "./pages/OrderHistory";
import { CartProvider } from "./context/CartContext";

function App() {
  return (
    <CartProvider>
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
          <Route path="/seller/orders/qr" element={<SellerOrderQr />} />
          <Route path="/seller/restock" element={<SellerRestock />} />
          <Route path="/seller/marketing-scheduler" element={<SellerMarketingScheduler />} />

          {/* Seller Offer Management */}
          <Route path="/seller/offers" element={<MySellerOffers />} />
          <Route path="/seller/offers/new" element={<CreateSellerOffer />} />

          {/* Email Verification for Seller Registration */}
          <Route path="/verify-seller-email" element={<VerifySellerEmail />} />

          {/* Cart, Checkout & Orders */}
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrderHistory />} />

          {/* Admin Login - Separate from regular login */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Protected Routes - Requires admin authentication */}
          <Route path="/admin/dashboard" element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/products/new" element={
            <AdminProtectedRoute>
              <CreateProduct />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <AdminProtectedRoute>
              <AdminProducts />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <AdminProtectedRoute>
              <AdminOrders />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/inventory" element={
            <AdminProtectedRoute>
              <AdminInventory />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/face-management" element={
            <AdminProtectedRoute>
              <AdminFaceManagement />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/bookkeeping" element={
            <AdminProtectedRoute>
              <AdminBookkeeping />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/dms-control" element={
            <AdminProtectedRoute>
              <AdminDmsControlTower />
            </AdminProtectedRoute>
          } />
          {/* DMS Delivery Center Portal */}
          <Route path="/dms/register" element={<DmsRegister />} />
          <Route path="/dms/login" element={<DmsLogin />} />
          <Route path="/dms/dashboard" element={
            <DmsProtectedRoute allowedScopes={["branch", "rider"]}>
              <DmsPortalHome />
            </DmsProtectedRoute>
          } />
          <Route path="/dms/center/dashboard" element={
            <DmsProtectedRoute allowedScopes={["branch", "rider"]}>
              <DmsCenterDashboard />
            </DmsProtectedRoute>
          } />
          <Route path="/dms/center/scan" element={
            <DmsProtectedRoute allowedScopes={["branch", "rider"]}>
              <DmsQrScanner />
            </DmsProtectedRoute>
          } />

        </Routes>
        <Chatbot />
        <CartWidget />
      </Router>
    </CartProvider>
  );
}

export default App;

