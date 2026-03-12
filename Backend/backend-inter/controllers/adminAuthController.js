import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "../models/user.js";

/**
 * ======================================================
 * ADMIN AUTHENTICATION CONTROLLER
 * Separate login system for admin users ONLY
 * Regular users cannot access this login endpoint
 * ======================================================
 */

/**
 * POST /api/admin/auth/login
 * Admin-only login with email and password
 * Rejects non-admin users at login time
 */
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user by email
    const user = await userModel.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // ⚠️ CRITICAL: Check if user is admin BEFORE password check
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account has been blocked. Contact support."
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate admin JWT token with longer expiry
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" } // Longer session for admin work
    );

    // Save token to user document
    user.token = token;
    await user.save();

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image
      }
    });

  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
}

/**
 * POST /api/admin/auth/register
 * Create a new admin account (requires existing admin auth)
 */
export async function createAdmin(req, res) {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password || !firstName) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and firstName are required"
      });
    }

    // Check if email already exists
    const existingUser = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const newAdmin = await userModel.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName,
      lastName: lastName || "",
      role: "admin",
      isEmailVerified: true
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating admin"
    });
  }
}

/**
 * GET /api/admin/auth/verify
 * Verify admin token is still valid
 */
export async function verifyAdminToken(req, res) {
  try {
    const user = await userModel.findById(req.user.id).select("-password -token");
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Invalid admin session"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin session valid",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image
      }
    });

  } catch (error) {
    console.error("Verify admin token error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during verification"
    });
  }
}

/**
 * POST /api/admin/auth/logout
 * Invalidate admin token
 */
export async function adminLogout(req, res) {
  try {
    await userModel.findByIdAndUpdate(req.user.id, { token: null });
    
    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });

  } catch (error) {
    console.error("Admin logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during logout"
    });
  }
}
