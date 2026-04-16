const express = require("express");
const { registerSchema, loginSchema, register, login } = require("../controllers/authController");
const validate = require("../middleware/validate");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

module.exports = router;
