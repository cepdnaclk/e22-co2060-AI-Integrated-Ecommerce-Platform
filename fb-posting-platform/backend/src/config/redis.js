const IORedis = require("ioredis");
const env = require("./env");

const connection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

module.exports = { connection };
