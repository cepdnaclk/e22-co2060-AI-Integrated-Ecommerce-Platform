import { isRedisAvailable, redisDel, redisGet, redisSet } from "../config/redis.js";
import { env } from "../config/env.js";
import { EventLogModel } from "../models/EventLog.js";
import { processAccountingEvent } from "./journalService.js";

const processingKey = (eventId) => `bookkeeping:processing:${eventId}`;
const processedKey = (eventId) => `bookkeeping:processed:${eventId}`;

const processWithoutRedis = async (event) => {
  const eventLog = await EventLogModel.findOne({ eventId: event.eventId }).lean();
  if (eventLog?.status === "PROCESSED") {
    return { status: "duplicate_db", eventId: event.eventId };
  }

  const result = await processAccountingEvent(event);
  await redisDel("report:trial-balance", "report:profit-loss", "report:balance-sheet");
  return { status: "processed_no_redis", eventId: event.eventId, ...result };
};

export const processEventWithIdempotency = async (event) => {
  if (!isRedisAvailable()) {
    return processWithoutRedis(event);
  }

  const alreadyProcessed = await redisGet(processedKey(event.eventId));
  if (alreadyProcessed) {
    return { status: "duplicate_redis", eventId: event.eventId };
  }

  const lock = await redisSet(
    processingKey(event.eventId),
    "1",
    "NX",
    "EX",
    env.processingLockTtlSeconds
  );

  if (!lock) {
    if (!isRedisAvailable()) {
      return processWithoutRedis(event);
    }
    return { status: "already_processing", eventId: event.eventId };
  }

  try {
    const eventLog = await EventLogModel.findOne({ eventId: event.eventId }).lean();
    if (eventLog?.status === "PROCESSED") {
      await redisSet(processedKey(event.eventId), "1", "EX", env.idempotencyTtlSeconds);
      return { status: "duplicate_db", eventId: event.eventId };
    }

    const result = await processAccountingEvent(event);
    await redisSet(processedKey(event.eventId), "1", "EX", env.idempotencyTtlSeconds);
    await redisDel("report:trial-balance", "report:profit-loss", "report:balance-sheet");
    return { status: "processed", eventId: event.eventId, ...result };
  } finally {
    await redisDel(processingKey(event.eventId));
  }
};

