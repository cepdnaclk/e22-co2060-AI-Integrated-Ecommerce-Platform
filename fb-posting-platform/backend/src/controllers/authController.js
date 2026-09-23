const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../config/prisma");
const { signToken } = require("../utils/jwt");

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = registerSchema;

async function register(req, res) {
  const { email, password } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed }
  });

  return res.status(201).json({
    token: signToken(user),
    user: { id: user.id, email: user.email }
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email }
  });
}

module.exports = { registerSchema, loginSchema, register, login };
