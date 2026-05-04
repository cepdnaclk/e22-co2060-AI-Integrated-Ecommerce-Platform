import crypto from "crypto";
import Seller from "../models/seller.js";
import User from "../models/user.js";
import PendingSellerVerification from "../models/pendingSellerVerification.js";
import jwt from "jsonwebtoken";
import { sendSellerVerificationEmail } from "../services/emailService.js";

/**
 * ======================================================
 * 1️⃣ REGISTER SELLER — Sends verification email
 * POST /api/sellers/register
 * ======================================================
 */
export async function registerSeller(req, res) {
  try {
    const userId = req.user.id;

    // 🔍 Prevent double-registration
    const existingSeller = await Seller.findOne({ userId });
    if (existingSeller) {
      return res.status(400).json({ message: "Seller profile already exists" });
    }

    // 🔍 Prevent duplicate pending verification
    await PendingSellerVerification.deleteMany({ userId });

    const { shopName, description, address, phone } = req.body;
    if (!shopName) {
      return res.status(400).json({ message: "Shop name is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔑 Generate unique verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 💾 Store pending seller data temporarily
    await PendingSellerVerification.create({
      userId,
      email: user.email,
      shopName,
      description,
      address,
      phone,
      verificationToken,
    });

    // 📧 Send verification email
    const origin = req.headers.origin || process.env.FRONTEND_URL;
    await sendSellerVerificationEmail(user.email, shopName, verificationToken, origin);

    return res.status(200).json({
      message: "Verification email sent! Please check your inbox to activate your seller account.",
    });
  } catch (error) {
    console.error("❌ Register seller error:", error);
    res.status(500).json({
      message: "Failed to initiate seller registration",
      error: error.message,
    });
  }
}

/**
 * ======================================================
 * 2️⃣ VERIFY SELLER EMAIL — Creates seller + upgrades role
 * GET /api/sellers/verify-email?token=xxx
 * ======================================================
 */
export async function verifySellerEmail(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Verification token is missing" });
    }

    // 🔍 Find the matching pending record
    const pending = await PendingSellerVerification.findOne({
      verificationToken: token,
    });

    if (!pending) {
      return res.status(400).json({
        message: "Invalid or expired verification link. Please register again.",
      });
    }

    // ✅ Create the actual Seller document
    const seller = await Seller.create({
      userId: pending.userId,
      shopName: pending.shopName,
      description: pending.description,
      address: pending.address,
      phone: pending.phone,
    });

    // 🔄 Upgrade User Role to Seller
    const user = await User.findById(pending.userId);
    if (user) {
      user.role = "seller";

      // ✅ Issue fresh JWT with seller role
      const appToken = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      user.token = appToken;
      await user.save();

      // 🧹 Delete the pending record
      await PendingSellerVerification.deleteOne({ _id: pending._id });

      return res.status(200).json({
        message: "Seller account verified successfully! 🎉",
        token: appToken,
        user: {
          email: user.email,
          role: user.role,
          image: user.image,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        seller,
      });
    }

    return res.status(500).json({ message: "User not found during verification" });
  } catch (error) {
    console.error("❌ Verify seller email error:", error);
    res.status(500).json({
      message: "Verification failed due to a server error",
      error: error.message,
    });
  }
}

/**
 * ======================================================
 * 3️⃣ GET LOGGED-IN SELLER PROFILE
 * GET /api/sellers/me
 * ======================================================
 */
export async function getMySellerProfile(req, res) {
  try {
    const userId = req.user.id;
    const seller = await Seller.findOne({ userId });

    if (!seller) {
      return res.status(403).json({ message: "You are not registered as a seller" });
    }

    const responseObj = seller.toObject();

    // If the frontend is polling with an outdated 'user' token, send them a fresh one
    if (req.user.role !== "seller") {
      const user = await User.findById(userId);
      if (user && user.role === "seller") {
        responseObj.newToken = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
      }
    }

    res.json(responseObj);
  } catch (error) {
    console.error("❌ Get seller profile error:", error);
    res.status(500).json({ message: "Failed to fetch seller profile", error: error.message });
  }
}

/**
 * ======================================================
 * 4️⃣ UPDATE SELLER PROFILE
 * PUT /api/sellers/me
 * ======================================================
 */
export async function updateSellerProfile(req, res) {
  try {
    const userId = req.user.id;
    const seller = await Seller.findOne({ userId });

    if (!seller) {
      return res.status(403).json({ message: "You are not registered as a seller" });
    }

    if (req.body.shopName !== undefined) seller.shopName = req.body.shopName;
    if (req.body.description !== undefined) seller.description = req.body.description;
    if (req.body.address !== undefined) seller.address = req.body.address;
    if (req.body.phone !== undefined) seller.phone = req.body.phone;

    await seller.save();

    res.json({ message: "Seller profile updated successfully", seller });
  } catch (error) {
    console.error("❌ Update seller profile error:", error);
    res.status(500).json({ message: "Failed to update seller profile", error: error.message });
  }
}

/**
 * ======================================================
 * 5️⃣ GET PUBLIC SELLER PROFILE
 * GET /api/sellers/:id
 * ======================================================
 */
export async function getSellerById(req, res) {
  try {
    const seller = await Seller.findById(req.params.id);

    if (!seller || !seller.isActive) {
      return res.status(404).json({ message: "Seller not found" });
    }

    res.json(seller);
  } catch (error) {
    console.error("❌ Get seller by id error:", error);
    res.status(500).json({ message: "Failed to fetch seller", error: error.message });
  }
}