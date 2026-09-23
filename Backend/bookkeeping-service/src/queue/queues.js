import { Queue } from "bullmq";
import { env } from "../config/env.js";
import { createRedisConnection } from "../config/redis.js";

export const bookkeepingQueue = new Queue(env.queueName, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 }
  }
});

