import jwt from "jsonwebtoken";

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.json({
      message: "Authorization header missing",
    });
  }

  console.log("🔐 Authorization Header:", authHeader);

  const token = authHeader.split(" ")[1];

  console.log("📥 Token received from frontend:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("✅ Token verified successfully");
    console.log("👤 Decoded user:", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.log("❌ Token verification failed");
    return res.json({
      message: "Invalid or expired token",
    });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    next();
  };
}
