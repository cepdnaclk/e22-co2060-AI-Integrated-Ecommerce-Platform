import IORedis from "ioredis";

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = Number(process.env.REDIS_PORT || 6379);
const shouldLogRedisErrors = (process.env.LOG_REDIS_ERRORS || "false").toLowerCase() === "true";

const redisConnection = new IORedis({
  host: redisHost,
  port: redisPort,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  lazyConnect: true,
  connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000),
  retryStrategy: (attempt) => {
    if (attempt > Number(process.env.REDIS_MAX_RECONNECT_ATTEMPTS || 5)) {
      return null;
    }
    return Math.min(attempt * 500, 2000);
  }
});

redisConnection.on("error", (error) => {
  if (shouldLogRedisErrors) {
    console.error("Redis connection error:", error.message);
  }
});

export default redisConnection;

