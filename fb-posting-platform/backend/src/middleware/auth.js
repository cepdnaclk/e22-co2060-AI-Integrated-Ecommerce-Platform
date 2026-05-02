const prisma = require("../config/prisma");
const { verifyToken } = require("../utils/jwt");

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyToken(auth.replace("Bearer ", ""));
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = authMiddleware;
