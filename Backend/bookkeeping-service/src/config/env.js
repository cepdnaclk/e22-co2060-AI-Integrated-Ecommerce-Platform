import dotenv from "dotenv";

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toInt(process.env.PORT, 4020),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/bookkeeping_service",
  redisHost: process.env.REDIS_HOST ?? "127.0.0.1",
  redisPort: toInt(process.env.REDIS_PORT, 6379),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisDb: toInt(process.env.REDIS_DB, 0),
  redisRequired: toBool(process.env.REDIS_REQUIRED, (process.env.NODE_ENV ?? "development") === "production"),
  queueName: process.env.QUEUE_NAME ?? "bookkeeping-events",
  reportCacheTtlSeconds: toInt(process.env.REPORT_CACHE_TTL_SECONDS, 300),
  workerConcurrency: toInt(process.env.WORKER_CONCURRENCY, 10),
  inlineEventProcessing: toBool(process.env.INLINE_EVENT_PROCESSING, true),
  processingLockTtlSeconds: toInt(process.env.PROCESSING_LOCK_TTL_SECONDS, 3600),
  idempotencyTtlSeconds: toInt(process.env.IDEMPOTENCY_TTL_SECONDS, 60 * 60 * 24 * 30),
  frontendOrigins: (
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
});

