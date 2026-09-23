import { Worker } from "bullmq";
import { env } from "./config/env.js";
import { connectMongo } from "./config/mongo.js";
import { assertRedisConnection, createTrackedRedisConnection } from "./config/redis.js";
import { processEventWithIdempotency } from "./services/eventProcessorService.js";
import { seedSystemData } from "./services/seedService.js";

const run = async () => {
  await assertRedisConnection();
  await connectMongo();
  await seedSystemData();

  const worker = new Worker(
    env.queueName,
    async (job) => processEventWithIdempotency(job.data),
    { connection: createTrackedRedisConnection("worker"), concurrency: env.workerConcurrency }
  );

  worker.on("completed", (job, result) => {
    console.log(`Processed event ${job.id}`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`Failed event ${job?.id}`, err);
  });

  console.log(`bookkeeping-service worker listening on queue ${env.queueName}`);
};

run().catch((error) => {
  console.error("Failed to start worker", error);
  process.exit(1);
});

