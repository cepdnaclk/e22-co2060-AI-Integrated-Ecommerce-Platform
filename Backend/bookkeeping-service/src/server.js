import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo } from "./config/mongo.js";
import { assertRedisConnection } from "./config/redis.js";
import { seedSystemData } from "./services/seedService.js";

const start = async () => {
  await assertRedisConnection();
  await connectMongo();
  await seedSystemData();
  const app = buildApp();
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`bookkeeping-service api listening on ${env.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});

