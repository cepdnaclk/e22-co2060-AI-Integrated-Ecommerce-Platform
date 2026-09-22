import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "../models/user.js";
import admin from "../config/firebaseAdmin.js"; // Use the fixed admin SDK

export function createFirebaseLogin({
  userRepo,
  signJwt
}) {
  return async function firebaseLogin(req, res) {
    console.log("📥 [Login] Firebase sync request received");
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn("⚠️ [Login] Missing or malformed Authorization header");
        return res.status(401).json({
          message: "Missing Firebase token",
        });
      }

      const idToken = authHeader.split(" ")[1];
      console.log("🔑 [Login] Verifying Firebase Token...");

      // STEP 1: Verify the token using the OFFICIAL Admin SDK
      // This is much faster and more reliable than manual JWT verification.
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log("✅ [Login] Token Verified for:", decodedToken.email);
      } catch (verifyErr) {
        console.error("❌ [Login] Firebase token verification failed:", verifyErr.message);
        return res.status(401).json({
          message: "Invalid or expired Firebase token",
          detail: verifyErr.message
        });
      }

      const email = decodedToken.email;
      const name = decodedToken.name || "";
      const picture = decodedToken.picture || "";

      if (!email) {
        console.warn("⚠️ [Login] Token missing email claim");
        return res.status(401).json({ message: "Token missing email claim" });
      }

      console.log("🔍 [Login] Looking up user in Database...");
      let user = await userRepo.findOne({ email });

      if (!user) {
        console.log("🆕 [Login] User not found. Creating new account...");
        user = await userRepo.create({
          email,
          firstName: name.split(" ")[0] || "User",
          lastName: name.split(" ").slice(1).join(" ") || "",
          password: "FIREBASE_AUTH",
          image: picture,
          isEmailVerified: true,
        });
        console.log("✅ [Login] New user created ID:", user._id);
      } else {
        console.log("👤 [Login] Existing user found ID:", user._id);
      }

      if (user.isBlocked) {
        console.warn("🚫 [Login] Blocked user attempt:", email);
        return res.status(403).json({
          message: "Account blocked",
        });
      }

      console.log("✍️ [Login] Signing Backend JWT...");

      const appToken = signJwt(
        {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      // Use updateOne instead of save() to avoid re-triggering
      // Mongoose date validators on migrated legacy records.
      await userModel.updateOne({ _id: user._id }, { $set: { token: appToken } });

      return res.json({
        message: "Login successful",
        token: appToken,
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
      console.error("❌ Unhandled error in firebaseLogin:", error.message, error.stack);
      return res.status(500).json({
        message: "Server error during login",
        detail: error.message,
      });
    }
  };
}

export const firebaseLogin = createFirebaseLogin({
  userRepo: userModel,
  signJwt: jwt.sign
});

export async function userPasswordLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await userModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account blocked" });
    }

    if (user.password === "FIREBASE_AUTH") {
      return res.status(400).json({
        message: "This account uses Firebase login. Use social sign-in."
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const appToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Use updateOne instead of save() to avoid re-triggering
    // Mongoose date validators on migrated legacy records.
    await userModel.updateOne({ _id: user._id }, { $set: { token: appToken } });

    return res.json({
      message: "Login successful",
      token: appToken,
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
    return res.status(500).json({
      message: "Server error during login",
      error: error.message
    });
  }
}
