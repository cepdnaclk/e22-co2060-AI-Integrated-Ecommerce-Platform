import API_BASE_URL from "../config/api";

const API_URL = `${API_BASE_URL}/api/users`;

export const fetchUserProfile = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("No token found");
    }

    const response = await fetch(`${API_URL}/profile`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to fetch profile");
    }

    return response.json();
};
