import userModel from "../models/user.js";
import axios from "axios";

/**
 * POST /api/users/register
 * Handles new user registration and triggers n8n welcome email
 */
export async function registerUser(req, res) {
    try {
        const { firstName, lastName, email, password } = req.body;

        // 1. Basic Validation
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // 2. Check if user already exists
        const userExists = await userModel.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // 3. Create the user in the database
        const newUser = await userModel.create({
            firstName,
            lastName,
            email,
            password // Ensure your userModel hashes this password before saving!
        });

        // 4. Trigger n8n Welcome Email Automation
        // Use your n8n Test URL (Update this if you move to Production)
        const n8nWebhookUrl = 'http://localhost:5678/webhook-test/user-signup';

        axios.post(n8nWebhookUrl, {
            email: newUser.email,
            name: newUser.firstName || "New User",
            signupDate: new Date()
        })
        .then(() => console.log(`n8n automation triggered for ${newUser.email}`))
        .catch(err => console.error("n8n automation failed:", err.message));

        // 5. Success Response
        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser._id,
                email: newUser.email,
                firstName: newUser.firstName
            }
        });

    } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).json({ message: "Server error during registration" });
    }
}

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
 * Updates editable profile fields
 */
export async function updateUserProfile(req, res) {
    try {
        const allowedFields = ["firstName", "lastName", "phone", "dateOfBirth", "gender", "address", "addressLocation", "bio", "image"];
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