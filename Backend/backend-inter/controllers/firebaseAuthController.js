import admin from "../config/firebaseAdmin.js";
import jwt from "jsonwebtoken";
import userModel from "../models/user.js";

export async function firebaseLogin(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Missing Firebase token",
      });
    }

    const idToken = authHeader.split(" ")[1];

    // ✅ Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const email = decodedToken.email;
    const name = decodedToken.name || "";
    const picture = decodedToken.picture || "";

    // ✅ Find or create user in MongoDB
    let user = await userModel.findOne({ email });

    if (!user) {
      user = await userModel.create({
        email,
        firstName: name.split(" ")[0] || "User",
        lastName: name.split(" ").slice(1).join(" ") || "",
        password: "FIREBASE_AUTH",
        image: picture,
        isEmailVerified: true,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "Account blocked",
      });
    }

    // ✅ Create YOUR JWT
    const appToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    user.token=appToken;
    await user.save();

    return res.json({
      message: "Login successful",
      token: appToken,
      user: {
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(401).json({
      message: "Invalid Firebase token",
    });
  }
}
