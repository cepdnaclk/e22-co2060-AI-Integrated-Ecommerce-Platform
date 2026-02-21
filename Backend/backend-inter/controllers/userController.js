import userModel from "../models/user.js";

/**
 * GET /api/users/profile
 * Returns the authenticated user's profile (no password/token)
 */
export async function getUserProfile(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password -token");
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return res.status(500).json({ message: "Server error while fetching profile" });
    }
}

/**
 * PUT /api/users/profile
 * Updates editable profile fields: firstName, lastName, phone, dateOfBirth, gender, address, bio, image
 */
export async function updateUserProfile(req, res) {
    try {
        const allowedFields = ["firstName", "lastName", "phone", "dateOfBirth", "gender", "address", "bio", "image"];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password -token");

        if (!user) return res.status(404).json({ message: "User not found" });

        return res.status(200).json({ message: "Profile updated successfully", user });
    } catch (error) {
        console.error("Error updating user profile:", error);
        return res.status(500).json({ message: "Server error while updating profile" });
    }
}
