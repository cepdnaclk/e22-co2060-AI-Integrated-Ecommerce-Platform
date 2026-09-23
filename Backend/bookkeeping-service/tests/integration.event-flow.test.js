import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { seedSystemData } from "../src/services/seedService.js";
import { EventLogModel } from "../src/models/EventLog.js";
import { JournalEntryModel } from "../src/models/JournalEntry.js";
import { processAccountingEvent } from "../src/services/journalService.js";

let replset;

test.before(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri());
  await seedSystemData();
});

test.after(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

test("event is processed into journal once", async () => {
  const event = {
    eventId: "evt-integration-1",
    type: "ORDER_PAID",
    timestamp: new Date().toISOString(),
    source: "integration-test",
    payload: { orderId: "1001", amount: 100 }
  };

  await EventLogModel.create({
    eventId: event.eventId,
    eventType: event.type,
    payloadHash: "testhash",
    source: event.source,
    status: "QUEUED",
    idempotencyKey: `event:${event.eventId}`,
    rawEvent: event
  });

  await processAccountingEvent(event);
  await processAccountingEvent(event);

  const journals = await JournalEntryModel.find({ eventId: event.eventId }).lean();
  assert.equal(journals.length, 1);

  const log = await EventLogModel.findOne({ eventId: event.eventId }).lean();
  assert.equal(log.status, "PROCESSED");
});

test("failed transaction marks event log as FAILED", async () => {
  const event = {
    eventId: "evt-integration-fail-1",
    type: "ORDER_SHIPPED",
    timestamp: new Date().toISOString(),
    source: "integration-test",
    payload: { orderId: "1002", cogsAmount: 0 }
  };

  await EventLogModel.create({
    eventId: event.eventId,
    eventType: event.type,
    payloadHash: "testhash2",
    source: event.source,
    status: "QUEUED",
    idempotencyKey: `event:${event.eventId}`,
    rawEvent: event
  });

  await assert.rejects(() => processAccountingEvent(event));

  const log = await EventLogModel.findOne({ eventId: event.eventId }).lean();
  assert.equal(log.status, "FAILED");
});

