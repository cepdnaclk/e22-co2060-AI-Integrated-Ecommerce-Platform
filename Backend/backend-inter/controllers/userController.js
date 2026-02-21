import userModel from "../models/user.js";

/**
 * ======================================================
 * ✅ GET USER PROFILE
 * Protected route to fetch the authenticated user's details
 * ======================================================
 */
export async function getUserProfile(req, res) {
    try {
        const userId = req.user.id; // comes from authMiddleware

        const user = await userModel.findById(userId).select("-password -token");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return res.status(500).json({
            message: "Server error while fetching profile",
        });
    }
}
