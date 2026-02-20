// src/services/sellerService.js
import { getAuthToken } from "../utils/auth";

const BASE_URL = "http://localhost:3000/api/sellers";

/**
 * ================================
 * REGISTER SELLER
 * POST /api/sellers/register
 * ================================
 */
export const registerSeller = async (sellerData) => {
  const token = getAuthToken();

  const response = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(sellerData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Seller registration failed");
  }

  return data;
};

/**
 * ================================
 * GET MY SELLER PROFILE
 * GET /api/sellers/me
 * ================================
 */
export const getMySellerProfile = async () => {
  const token = getAuthToken();

  const response = await fetch(`${BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch seller profile");
  }

  return data;
};