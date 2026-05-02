import IORedis from "ioredis";
import { env } from "./env.js";

const redisOptions = {
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
  db: env.redisDb,
  maxRetriesPerRequest: null,
  ...(env.redisRequired
    ? {}
    : {
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: () => null
      })
};

let RedisCtor = IORedis;
if ((process.env.NODE_ENV ?? "").toLowerCase() === "test" || process.env.USE_REDIS_MOCK === "true") {
  const { default: RedisMock } = await import("ioredis-mock");
  RedisCtor = RedisMock;
}

export const redisConnection = new RedisCtor(redisOptions);
export const createRedisConnection = () => new RedisCtor(redisOptions);

let redisAvailable = true;
let redisFallbackWarningPrinted = false;

const formatRedisError = (error) =>
  `Redis connection failed (${env.redisHost}:${env.redisPort}) - ${error.message}`;

const markRedisUnavailable = (error) => {
  redisAvailable = false;
  if (!redisFallbackWarningPrinted && !env.redisRequired) {
    const reason = error ? ` Reason: ${error.message}` : "";
    console.warn(`[redis] Continuing without Redis because REDIS_REQUIRED=false.${reason}`);
    redisFallbackWarningPrinted = true;
  }
};

const attachErrorLogger = (client, label) => {
  client.on("error", (error) => {
    markRedisUnavailable(error);
    if (!env.redisRequired && redisFallbackWarningPrinted) {
      return;
    }
    console.error(`[redis:${label}] ${formatRedisError(error)}`);
  });
  return client;
};

attachErrorLogger(redisConnection, "shared");

export const createTrackedRedisConnection = (label) =>
  attachErrorLogger(createRedisConnection(), label);

export const isRedisAvailable = () => redisAvailable;

export const assertRedisConnection = async () => {
  try {
    if (redisConnection.status === "wait") {
      await redisConnection.connect();
    }
    await redisConnection.ping();
    redisAvailable = true;
    return true;
  } catch (error) {
    if (env.redisRequired) {
      throw new Error(formatRedisError(error));
    }
    markRedisUnavailable(error);
    return false;
  }
};

const withRedisFallback = async (operation, fallbackValue) => {
  if (!redisAvailable) {
    return fallbackValue;
  }
  try {
    return await operation();
  } catch (error) {
    markRedisUnavailable(error);
    return fallbackValue;
  }
};

export const redisGet = async (key) =>
  withRedisFallback(() => redisConnection.get(key), null);

export const redisSet = async (key, value, ...args) =>
  withRedisFallback(() => redisConnection.set(key, value, ...args), null);

export const redisDel = async (...keys) =>
  withRedisFallback(() => redisConnection.del(...keys), 0);

