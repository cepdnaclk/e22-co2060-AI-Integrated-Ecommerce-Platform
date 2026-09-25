// src/utils/auth.js

export const getAuthToken = () => {
  return localStorage.getItem("token"); // backend JWT
};

export const clearAuthSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("sellerToken");
};

let isHandlingAuthFailure = false;

export const handleAuthFailure = (customMessage = "Your session has expired. Please sign in again.") => {
  if (isHandlingAuthFailure) return;
  isHandlingAuthFailure = true;

  // 1. Clear stale authentication token & user state
  clearAuthSession();

  // 2. Broadcast session expiration event to update active React contexts (e.g. CartContext)
  window.dispatchEvent(
    new CustomEvent("auth:session-expired", { detail: { message: customMessage } })
  );

  // 3. Store clean notification for Login page display
  try {
    sessionStorage.setItem("authMessage", customMessage);
  } catch (e) {
    // sessionStorage unavailable fallback
  }

  // 4. Redirect to login while preserving target route
  const currentPath = window.location.pathname + window.location.search;
  const isAuthPage = ["/login", "/signup", "/admin/login"].includes(window.location.pathname);

  setTimeout(() => {
    if (!isAuthPage && currentPath && currentPath !== "/") {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    } else if (!isAuthPage) {
      window.location.href = "/login";
    }

    // Reset guard flag after navigation completes
    setTimeout(() => {
      isHandlingAuthFailure = false;
    }, 2000);
  }, 50);
};