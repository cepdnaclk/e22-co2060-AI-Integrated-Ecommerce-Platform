import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "../models/user.js";
import AdminLoginLog from "../models/adminLoginLog.js";
import {
  isFaceEnabled,
  generateEmbedding,
  verifyFace,
} from "../services/faceService.js";

/**
 * ======================================================
 * ADMIN AUTHENTICATION CONTROLLER
 * Separate login system for admin users ONLY
 * Regular users cannot access this login endpoint
 *
 * Face Recognition is OPTIONAL — controlled by the
 * FACE_RECOGNITION_ENABLED env flag. All face logic
 * is isolated in services/faceService.js.
 * ======================================================
 */

// In-memory brute-force limiter (per IP)
const _loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 min

function _checkRateLimit(ip) {
  const now = Date.now();
  const entry = _loginAttempts.get(ip);
  if (!entry) return true;
  if (now - entry.firstAttempt > LOCK_WINDOW_MS) {
    _loginAttempts.delete(ip);
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

function _recordAttempt(ip) {
  const now = Date.now();
  const entry = _loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > LOCK_WINDOW_MS) {
    _loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count++;
  }
}

function _clearAttempts(ip) {
  _loginAttempts.delete(ip);
}

function _getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
}

/**
 * POST /api/admin/auth/login
 * Step 1 of login: email + password verification.
 * If face recognition is disabled → full login.
 * If face recognition is enabled → returns pendingFaceVerify token.
 */
export async function adminLogin(req, res) {
  const ip = _getClientIp(req);

  try {
    // Rate-limit check
    if (!_checkRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many login attempts. Try again in 15 minutes.",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await userModel.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      _recordAttempt(ip);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account has been blocked. Contact support.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      _recordAttempt(ip);
      await AdminLoginLog.create({
        adminId: user._id,
        email: user.email,
        ipAddress: ip,
        device: req.headers["user-agent"] || "unknown",
        success: false,
        failureReason: "invalid_password",
      });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // ── Face recognition gate ──
    const faceEnabled = isFaceEnabled();
    const hasFaceEnrolled =
      user.faceEmbedding && Array.isArray(user.faceEmbedding) && user.faceEmbedding.length > 0;

    if (faceEnabled) {
      // Issue short-lived "pending" token for the face step
      const pendingToken = jwt.sign(
        { id: user._id, email: user.email, role: user.role, pendingFace: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      if (hasFaceEnrolled) {
        // Admin has face → verify it
        return res.status(200).json({
          success: true,
          requireFaceVerification: true,
          requireFaceEnrollment: false,
          pendingToken,
          message: "Password verified. Face verification required.",
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            image: user.image,
          },
        });
      } else {
        // Admin has NO face → must enroll before first login
        return res.status(200).json({
          success: true,
          requireFaceVerification: false,
          requireFaceEnrollment: true,
          pendingToken,
          message: "Password verified. Please register your face to continue.",
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            image: user.image,
          },
        });
      }
    }

    // No face required — issue full session
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    user.token = token;
    await user.save();
    _clearAttempts(ip);

    await AdminLoginLog.create({
      adminId: user._id,
      email: user.email,
      ipAddress: ip,
      device: req.headers["user-agent"] || "unknown",
      success: true,
      faceVerified: false,
      faceSkipped: true,
    });

    return res.status(200).json({
      success: true,
      requireFaceVerification: false,
      message: "Admin login successful",
      token,
      faceRecognitionEnabled: faceEnabled,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
}

/**
 * POST /api/admin/auth/verify-face
 * Step 2 of login (only when face recognition enabled).
 * Expects: { pendingToken, faceImage (base64) }
 */
export async function adminVerifyFace(req, res) {
  const ip = _getClientIp(req);

  try {
    const { pendingToken, faceImage } = req.body;

    if (!pendingToken || !faceImage) {
      return res.status(400).json({
        success: false,
        message: "pendingToken and faceImage are required",
      });
    }

    // Decode the short-lived pending token
    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Face verification session expired. Please login again.",
      });
    }

    if (!decoded.pendingFace) {
      return res.status(400).json({
        success: false,
        message: "Invalid pending token",
      });
    }

    const user = await userModel.findById(decoded.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Invalid admin" });
    }

    // Call face recognition service
    const faceResult = await verifyFace(
      faceImage,
      user.faceEmbedding,
      user._id.toString()
    );

    if (!faceResult.verified) {
      _recordAttempt(ip);
      await AdminLoginLog.create({
        adminId: user._id,
        email: user.email,
        ipAddress: ip,
        device: req.headers["user-agent"] || "unknown",
        success: false,
        faceVerified: false,
        failureReason: `face_mismatch (similarity: ${faceResult.similarity || 0})`,
      });
      return res.status(401).json({
        success: false,
        message: "Face verification failed. Please try again.",
        similarity: faceResult.similarity,
      });
    }

    // Face verified — issue full session token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    user.token = token;
    await user.save();
    _clearAttempts(ip);

    await AdminLoginLog.create({
      adminId: user._id,
      email: user.email,
      ipAddress: ip,
      device: req.headers["user-agent"] || "unknown",
      success: true,
      faceVerified: true,
      faceSkipped: false,
    });

    return res.status(200).json({
      success: true,
      message: "Face verified. Login successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Face verification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Face verification failed",
    });
  }
}

/**
 * POST /api/admin/auth/enroll-face
 * First-time face enrollment during login.
 * Uses pendingToken (not full auth) so admin can enroll before getting a session.
 * Saves the embedding and issues a full JWT.
 */
export async function adminEnrollFace(req, res) {
  const ip = _getClientIp(req);

  try {
    const { pendingToken, faceImage } = req.body;

    if (!pendingToken || !faceImage) {
      return res.status(400).json({
        success: false,
        message: "pendingToken and faceImage are required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Enrollment session expired. Please login again.",
      });
    }

    if (!decoded.pendingFace) {
      return res.status(400).json({ success: false, message: "Invalid pending token" });
    }

    const user = await userModel.findById(decoded.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Invalid admin" });
    }

    // Generate embedding via Python service
    const result = await generateEmbedding(faceImage);

    if (!result.success || !result.embedding) {
      return res.status(400).json({
        success: false,
        message: "Could not detect a face. Ensure your face is clearly visible and well-lit.",
      });
    }

    // Save embedding
    user.faceEmbedding = result.embedding;

    // Issue full session token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    user.token = token;
    await user.save();
    _clearAttempts(ip);

    await AdminLoginLog.create({
      adminId: user._id,
      email: user.email,
      ipAddress: ip,
      device: req.headers["user-agent"] || "unknown",
      success: true,
      faceVerified: true,
      faceSkipped: false,
    });

    return res.status(200).json({
      success: true,
      message: "Face enrolled successfully. Login complete.",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Face enrollment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Face enrollment failed",
    });
  }
}

/**
 * POST /api/admin/auth/register-face
 * Enroll / update admin face embedding.
 * Requires admin auth.
 */
export async function registerAdminFace(req, res) {
  try {
    const { faceImage } = req.body;

    if (!faceImage) {
      return res.status(400).json({
        success: false,
        message: "faceImage (base64) is required",
      });
    }

    if (!isFaceEnabled()) {
      return res.status(400).json({
        success: false,
        message: "Face recognition is not enabled on this server",
      });
    }

    const result = await generateEmbedding(faceImage);

    if (!result.success || !result.embedding) {
      return res.status(400).json({
        success: false,
        message: "Could not generate face embedding. Ensure your face is clearly visible.",
      });
    }

    await userModel.findByIdAndUpdate(req.user.id, {
      faceEmbedding: result.embedding,
    });

    return res.status(200).json({
      success: true,
      message: "Face registered successfully",
    });
  } catch (error) {
    console.error("Register face error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to register face",
    });
  }
}

/**
 * DELETE /api/admin/auth/remove-face
 * Remove admin face embedding.
 */
export async function removeAdminFace(req, res) {
  try {
    await userModel.findByIdAndUpdate(req.user.id, { faceEmbedding: null });
    return res.status(200).json({
      success: true,
      message: "Face data removed successfully",
    });
  } catch (error) {
    console.error("Remove face error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove face data",
    });
  }
}

/**
 * GET /api/admin/auth/face-status
 * Returns whether face recognition is enabled and if admin has face enrolled.
 */
export async function getFaceStatus(req, res) {
  try {
    const user = await userModel.findById(req.user.id).select("faceEmbedding");
    const hasFace =
      user?.faceEmbedding && Array.isArray(user.faceEmbedding) && user.faceEmbedding.length > 0;

    return res.status(200).json({
      success: true,
      faceRecognitionEnabled: isFaceEnabled(),
      faceEnrolled: !!hasFace,
    });
  } catch (error) {
    console.error("Face status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/admin/auth/admins
 * List all admin users with face enrollment status.
 */
export async function listAdmins(req, res) {
  try {
    const admins = await userModel
      .find({ role: "admin" })
      .select("email firstName lastName image faceEmbedding createdAt isBlocked")
      .sort({ createdAt: 1 });

    const adminList = admins.map((a) => ({
      id: a._id,
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      image: a.image,
      isBlocked: a.isBlocked || false,
      faceEnrolled:
        a.faceEmbedding && Array.isArray(a.faceEmbedding) && a.faceEmbedding.length > 0,
      createdAt: a.createdAt,
    }));

    return res.status(200).json({
      success: true,
      admins: adminList,
      faceRecognitionEnabled: isFaceEnabled(),
    });
  } catch (error) {
    console.error("List admins error:", error);
    return res.status(500).json({ success: false, message: "Failed to list admins" });
  }
}

/**
 * POST /api/admin/auth/register-face/:adminId
 * Register face for another admin (owner scans their face).
 */
export async function registerAdminFaceById(req, res) {
  try {
    const { adminId } = req.params;
    const { faceImage } = req.body;

    if (!faceImage) {
      return res.status(400).json({ success: false, message: "faceImage (base64) is required" });
    }

    if (!isFaceEnabled()) {
      return res.status(400).json({ success: false, message: "Face recognition is not enabled" });
    }

    const targetAdmin = await userModel.findById(adminId);
    if (!targetAdmin || targetAdmin.role !== "admin") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const result = await generateEmbedding(faceImage);

    if (!result.success || !result.embedding) {
      return res.status(400).json({
        success: false,
        message: "Could not detect a face. Ensure the face is clearly visible and well-lit.",
      });
    }

    targetAdmin.faceEmbedding = result.embedding;
    await targetAdmin.save();

    return res.status(200).json({
      success: true,
      message: `Face registered for ${targetAdmin.firstName || targetAdmin.email}`,
    });
  } catch (error) {
    console.error("Register face by ID error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to register face" });
  }
}

/**
 * DELETE /api/admin/auth/remove-face/:adminId
 * Remove face for another admin.
 */
export async function removeAdminFaceById(req, res) {
  try {
    const { adminId } = req.params;

    const targetAdmin = await userModel.findById(adminId);
    if (!targetAdmin || targetAdmin.role !== "admin") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    targetAdmin.faceEmbedding = null;
    await targetAdmin.save();

    return res.status(200).json({
      success: true,
      message: `Face removed for ${targetAdmin.firstName || targetAdmin.email}`,
    });
  } catch (error) {
    console.error("Remove face by ID error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove face" });
  }
}

/**
 * GET /api/admin/auth/login-logs
 * Return recent admin login audit logs.
 */
export async function getLoginLogs(req, res) {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AdminLoginLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("adminId", "email firstName lastName image"),
      AdminLoginLog.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      logs,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    console.error("Login logs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch login logs" });
  }
}

/**
 * POST /api/admin/auth/register
 * Create a new admin account (requires existing admin auth)
 */
export async function createAdmin(req, res) {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and firstName are required",
      });
    }

    const existingUser = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await userModel.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName,
      lastName: lastName || "",
      role: "admin",
      isEmailVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating admin",
    });
  }
}

/**
 * GET /api/admin/auth/verify
 * Verify admin token is still valid
 */
export async function verifyAdminToken(req, res) {
  try {
    // Reject pending face tokens — they are NOT full sessions
    if (req.user.pendingFace) {
      return res.status(401).json({
        success: false,
        message: "Face verification incomplete. Please login again.",
      });
    }

    const user = await userModel.findById(req.user.id).select("-password -token -faceEmbedding");

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Invalid admin session",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin session valid",
      faceRecognitionEnabled: isFaceEnabled(),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Verify admin token error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during verification",
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
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
}
