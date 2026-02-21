const API_URL = "http://localhost:3000/api/users";

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
