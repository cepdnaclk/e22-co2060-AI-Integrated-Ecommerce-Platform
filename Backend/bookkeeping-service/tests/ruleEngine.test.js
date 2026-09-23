import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { seedSystemData } from "../src/services/seedService.js";
import { buildJournalDraftFromEvent } from "../src/services/ruleEngineService.js";

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await seedSystemData();
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("MARKETPLACE_SETTLEMENT builds balanced multi-line draft", async () => {
  const event = {
    eventId: "evt-market-1",
    type: "MARKETPLACE_SETTLEMENT",
    timestamp: new Date().toISOString(),
    source: "test",
    payload: {
      settlementId: "S1",
      marketplaceGross: 4300,
      marketplaceFees: 450,
      marketplaceNet: 3850
    }
  };

  const draft = await buildJournalDraftFromEvent(event);
  assert.equal(draft.lines.length, 3);
  assert.equal(draft.totalDebits, 4300);
  assert.equal(draft.totalCredits, 4300);
});

test("throws when rule produces invalid lines", async () => {
  const event = {
    eventId: "evt-bad-1",
    type: "ORDER_SHIPPED",
    timestamp: new Date().toISOString(),
    source: "test",
    payload: {
      orderId: "o1",
      cogsAmount: 0
    }
  };

  await assert.rejects(() => buildJournalDraftFromEvent(event), /Invalid rule output|Unbalanced entry/);
});

