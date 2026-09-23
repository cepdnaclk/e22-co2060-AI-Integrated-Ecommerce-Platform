// src/services/sellerService.js
import { getAuthToken } from "../utils/auth";
import API_BASE_URL from "../config/api";

const BASE_URL = `${API_BASE_URL}/api/sellers`;

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
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sellerData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Seller registration failed");
  }

  return data; // { message, seller }
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
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch seller profile");
  }

  return data;
};