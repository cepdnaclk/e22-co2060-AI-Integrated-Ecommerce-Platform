/**
 * ======================================================
 * REQUIRE CEO MIDDLEWARE
 * Only allows users with role "ceo" to proceed.
 * Must be used AFTER verifyToken middleware.
 * ======================================================
 */
export const requireCEO = (req, res, next) => {
  if (!req.user || req.user.role !== "ceo") {
    return res.status(403).json({
      success: false,
      message: "Access denied. CEO privileges required.",
    });
  }
  next();
};

export default requireCEO;
