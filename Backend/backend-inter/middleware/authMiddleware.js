/**
 * ======================================================
 * AUTH MIDDLEWARE
 * ======================================================
 * Verifies JWT Bearer tokens issued by the BEETA backend.
 *
 * Token payload shape:  { id, email, role }
 * Roles:  customer | seller | admin | ceo
 *
 * Usage (per-route):
 *   router.get("/path", authMiddleware, handler);
 *
 * Usage (role guard):
 *   router.get("/path", authMiddleware, authorizeRoles("admin","ceo"), handler);
 *
 * Usage (router-level guard):
 *   router.use(verifyToken, authorizeRoles("admin","ceo"));
 * ======================================================
 */

import jwt from "jsonwebtoken";

/**
 * Default export: verifyToken
 * Verifies the Authorization Bearer token.
 * Sets req.user = { id, email, role } on success.
 * Returns 401 if missing or invalid, 401 if expired.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
};

/**
 * Named export: authorizeRoles
 * Must be used AFTER verifyToken.
 * Restricts access to users whose role is in the allowed list.
 * Returns 403 if the authenticated user's role is not permitted.
 *
 * @param {...string} roles - Allowed roles, e.g. "admin", "ceo"
 */
export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Forbidden. You do not have permission to access this resource."
    });
  }
  next();
};

// Default export is verifyToken (matches all existing import patterns)
export default verifyToken;
