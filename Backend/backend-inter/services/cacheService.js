import Redis from "ioredis";

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = Number(process.env.REDIS_PORT || 6379);

let redis = null;
let isConnected = false;

try {
  redis = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 100, 2000);
    }
  });

  redis.on("connect", () => {
    isConnected = true;
    console.log("⚡ Redis Cache Service: Connected");
  });

  redis.on("error", (err) => {
    isConnected = false;
    console.warn("⚠️ Redis Cache Warning:", err.message);
  });
} catch (e) {
  console.warn("⚠️ Could not initialize Redis Client:", e.message);
}

/**
 * Retrieve cached JSON object by key
 */
export async function getCache(key) {
  if (!isConnected || !redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn("⚠️ Redis Get Error:", err.message);
    return null;
  }
}

/**
 * Set JSON object in cache with expiration (TTL in seconds)
 */
export async function setCache(key, value, ttlSeconds = 300) {
  if (!isConnected || !redis) return;
  try {
    const stringified = typeof value === "string" ? value : JSON.stringify(value);
    await redis.set(key, stringified, "EX", ttlSeconds);
  } catch (err) {
    console.warn("⚠️ Redis Set Error:", err.message);
  }
}

/**
 * Delete key or matching pattern from cache
 */
export async function delCache(pattern) {
  if (!isConnected || !redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys && keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn("⚠️ Redis Del Error:", err.message);
  }
}
