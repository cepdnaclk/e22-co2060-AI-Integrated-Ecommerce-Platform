// src/utils/auth.js
export const getAuthToken = () => {
  return localStorage.getItem("token"); // backend JWT
};