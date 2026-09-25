/**
 * ======================================================
 * ADMIN PROTECTED ROUTE
 * ======================================================
 * A route guard for admin-only pages.
 *
 * Checks for a valid adminToken in localStorage.
 * If no token is present, redirects to /admin/login.
 *
 * IMPORTANT:
 * This is a UX convenience only. Backend authorization
 * remains the authoritative security boundary — all admin
 * API endpoints verify the JWT token server-side.
 *
 * Usage in App.jsx:
 *   <Route path="/admin/dashboard" element={
 *     <AdminProtectedRoute>
 *       <AdminDashboard />
 *     </AdminProtectedRoute>
 *   } />
 * ======================================================
 */

import React from "react";
import { Navigate } from "react-router-dom";

export default function AdminProtectedRoute({ children }) {
  const token =
    localStorage.getItem("adminToken") || localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
