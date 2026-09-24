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
    const dateStr = new Date(event.timestamp).toISOString().split('T')[0].replace(/-/g, '');
    const randSequence = Math.floor(Math.random() * 900000) + 100000;
    const transactionId = event.payload.transactionId || `TXN-${dateStr}-${randSequence}`;
    
    // Inject generated transactionId into event payload so downstream services use it
    event.payload.transactionId = transactionId;
    
    await EventLogModel.create({
      eventId: event.eventId,
      transactionId,
      orderId: event.payload.orderId || null,
      paymentReference: event.payload.paymentId || event.payload.reference || null,
      sellerId: event.payload.sellerId || null,
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

