import IORedis from "ioredis";

const facebookEnabled = (process.env.ENABLE_FACEBOOK_MODULE || "true").toLowerCase() === "true";
const shouldLogRedisErrors = (process.env.LOG_REDIS_ERRORS || "false").toLowerCase() === "true";

const redisConnection = facebookEnabled
  ? new IORedis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000),
      retryStrategy: (attempt) => {
        if (attempt > Number(process.env.REDIS_MAX_RECONNECT_ATTEMPTS || 2)) {
          return null;
        }
        return Math.min(attempt * 500, 2000);
      }
    })
  : {
      on() {
        return this;
      },
      quit: async () => {},
      disconnect: () => {}
    };

if (facebookEnabled) {
  redisConnection.on("error", (error) => {
    if (shouldLogRedisErrors) {
      console.error("Redis connection error:", error.message);
    }
  });
}

export default redisConnection;
