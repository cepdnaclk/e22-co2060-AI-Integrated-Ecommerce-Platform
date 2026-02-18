import jwt from "jsonwebtoken";

/**
 * ======================================================
 * ✅ VERIFY JWT TOKEN (DEFAULT EXPORT)
 * Attaches decoded user to req.user
 * ======================================================
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token missing or malformed"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

/**
 * ======================================================
 * ✅ ROLE-BASED AUTHORIZATION (NAMED EXPORT)
 * Usage: authorizeRoles("admin"), authorizeRoles("seller")
 * ======================================================
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: insufficient permissions"
      });
    }
    next();
  };
};

export default verifyToken;
