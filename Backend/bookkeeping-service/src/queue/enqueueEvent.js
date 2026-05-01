import crypto from "node:crypto";
import { EventLogModel } from "../models/EventLog.js";
import { bookkeepingQueue } from "./queues.js";
import { env } from "../config/env.js";
import { isRedisAvailable } from "../config/redis.js";

const hashPayload = (payload) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

const toQueueJobId = (eventId) =>
  `evt-${crypto.createHash("sha256").update(String(eventId)).digest("hex")}`;

export const enqueueEvent = async (event) => {
  const idempotencyKey = `event:${event.eventId}`;
  const payloadHash = hashPayload(event);

  const existing = await EventLogModel.findOne({ eventId: event.eventId }).lean();
  if (existing && existing.status === "PROCESSED") {
    return { status: "duplicate", eventId: event.eventId };
  }

  if (!existing) {
    await EventLogModel.create({
      eventId: event.eventId,
      eventType: event.type,
      payloadHash,
      source: event.source,
      status: "QUEUED",
      idempotencyKey,
      rawEvent: event
    });
  }

  if (!isRedisAvailable()) {
    return { status: "recorded_no_queue", eventId: event.eventId };
  }

  try {
    await bookkeepingQueue.add(event.type, event, { jobId: toQueueJobId(event.eventId) });
    return { status: existing ? "requeued" : "queued", eventId: event.eventId };
  } catch (error) {
    if (env.redisRequired) {
      throw error;
    }
    return {
      status: "recorded_no_queue",
      eventId: event.eventId,
      queueError: error.message
    };
  }
};

