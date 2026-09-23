import express from "express";
import morgan from "morgan";
import cors from "cors";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export const buildApp = () => {
  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          env.frontendOrigins.includes(origin) ||
          localhostOriginPattern.test(origin)
        ) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
      }
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("combined"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "bookkeeping-service" });
  });

  app.use("/", apiRouter);

  app.use((error, _req, res, _next) => {
    const message = error?.message ?? "Internal server error";
    const statusCode = message.includes("Invalid") || message.includes("Missing required payload path") ? 400 : 500;
    res.status(statusCode).json({ message });
  });

  return app;
};

