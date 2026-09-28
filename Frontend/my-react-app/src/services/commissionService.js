import API_BASE_URL from "../config/api";

/**
 * Helper to get the correct admin token
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    };
};

/**
 * Fetch the current active commission policy
 */
export async function getCommissionPolicy() {
    const response = await fetch(`${API_BASE_URL}/api/admin/commission`, {
        method: "GET",
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch commission policy");
    }

    return response.json();
}

/**
 * Update the active commission policy rate
 * @param {Object} payload { rate: Number }
 */
export async function updateCommissionPolicy(payload) {
    const response = await fetch(`${API_BASE_URL}/api/admin/commission`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update commission policy");
    }

    return response.json();
}
