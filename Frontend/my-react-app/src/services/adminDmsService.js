import API_BASE_URL from "../config/api";

const DMS_ADMIN_BASE = `${API_BASE_URL}/api/dms/admin`;

function getAdminToken() {
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      search.set(key, `${value}`);
    }
  });
  const q = search.toString();
  return q ? `?${q}` : "";
}

async function adminDmsRequest(path, { method = "GET", body, params } = {}) {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session token is missing");

  const response = await fetch(`${DMS_ADMIN_BASE}${path}${queryString(params)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error ? `: ${data.error}` : "";
    throw new Error((data?.message || "Admin DMS request failed") + detail);
  }

  return data;
}

export const adminDmsService = {
  getControlTower(params = {}) {
    return adminDmsRequest("/centers/control-tower", { params });
  },

  verifyCenter(branchId, payload = {}) {
    return adminDmsRequest(`/centers/${branchId}/verify`, { method: "POST", body: payload });
  },

  suspendCenter(branchId, payload = {}) {
    return adminDmsRequest(`/centers/${branchId}/suspend`, { method: "POST", body: payload });
  },

  verifyRider(staffId, payload = {}) {
    return adminDmsRequest(`/staff/${staffId}/approve`, { method: "POST", body: payload });
  },

  suspendRider(staffId, payload = {}) {
    return adminDmsRequest(`/staff/${staffId}/suspend`, { method: "POST", body: payload });
  },
};
