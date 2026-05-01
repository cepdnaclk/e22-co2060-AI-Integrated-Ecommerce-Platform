const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const facebookRoutes = require("./routes/facebookRoutes");
const postsRoutes = require("./routes/postsRoutes");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120
  })
);

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/facebook", facebookRoutes);
app.use("/api/posts", postsRoutes);
app.use(errorHandler);

module.exports = app;
