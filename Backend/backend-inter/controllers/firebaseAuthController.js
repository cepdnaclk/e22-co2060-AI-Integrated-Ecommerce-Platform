import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import userModel from "../models/user.js";

export function createFirebaseLogin({
  getAdminClient,
  userRepo,
  signJwt
}) {
  return async function firebaseLogin(req, res) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          message: "Missing Firebase token",
        });
      }

      const idToken = authHeader.split(" ")[1];
      const adminClient = await getAdminClient();
      const decodedToken = await adminClient.auth().verifyIdToken(idToken);

      const email = decodedToken.email;
      const name = decodedToken.name || "";
      const picture = decodedToken.picture || "";

      let user = await userRepo.findOne({ email });

      if (!user) {
        user = await userRepo.create({
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

      const appToken = signJwt(
        {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      user.token = appToken;
      await user.save();

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
      return res.status(401).json({
        message: "Invalid Firebase token",
      });
    }
  };
}

let cachedAdminClient = null;

async function getAdminClient() {
  if (!cachedAdminClient) {
    const module = await import("../config/firebaseAdmin.js");
    cachedAdminClient = module.default;
  }
  return cachedAdminClient;
}

export const firebaseLogin = createFirebaseLogin({
  getAdminClient,
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

    user.token = appToken;
    await user.save();

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
