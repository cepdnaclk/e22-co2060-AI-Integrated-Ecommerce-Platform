/**
 * migrateLedgerTraceability.js  (v2 - canonical TXN IDs)
 *
 * RULES:
 *   - One JournalEntry = one transactionId
 *   - All LedgerBalance.history lines that belong to the same JournalEntry
 *     must share that exact transactionId
 *   - transactionId is derived deterministically from eventId so re-runs
 *     produce the same IDs (idempotent)
 *
 * Safe to re-run multiple times.
 *
 * Usage:
 *   node scripts/migrateLedgerTraceability.js
 */

import mongoose from "mongoose";
import { createHash } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bookkeeping_service";

/** Derive a stable TXN-YYYYMMDD-XXXXXX from an eventId or ObjectId string */
function stableTxnId(seed, postedAt) {
  const dateStr = postedAt
    ? new Date(postedAt).toISOString().slice(0, 10).replace(/-/g, "")
    : "00000000";
  // 6-digit hex → decimal so it looks like the runtime format
  const hash = createHash("sha1").update(String(seed)).digest("hex");
  const num = (parseInt(hash.slice(0, 6), 16) % 900000) + 100000;
  return `TXN-${dateStr}-${num}`;
}

async function run() {
  console.log("Connecting to:", MONGO_URI.replace(/\/\/.*@/, "//****:****@").split("?")[0]);
  await mongoose.connect(MONGO_URI);
  console.log("Connected.\n");

  const db = mongoose.connection.db;
  const journalsColl = db.collection("journalentries");
  const ledgersColl  = db.collection("ledgerbalances");

  // ── Step 1: Ensure every JournalEntry has a stable transactionId ──────────
  console.log("Step 1 – Backfilling transactionId on JournalEntry documents...");
  const allJournals = await journalsColl.find({}).toArray();

  // Build canonical map: journalEntry._id.toString() → transactionId
  const journalTxnMap = new Map();   // _id.str → transactionId
  const journalMetaMap = new Map();  // _id.str → { orderId, paymentReference, sellerId, description }

  let jePatched = 0;
  for (const j of allJournals) {
    const idStr = j._id.toString();
    let txnId = j.transactionId;

    if (!txnId) {
      // Derive from eventId (stable across runs)
      txnId = stableTxnId(j.eventId || idStr, j.eventTimestamp || j.createdAt);
      await journalsColl.updateOne(
        { _id: j._id },
        { $set: { transactionId: txnId } }
      );
      jePatched++;
    }

    journalTxnMap.set(idStr, txnId);
    journalMetaMap.set(idStr, {
      orderId: j.orderId || null,
      paymentReference: j.paymentReference || null,
      sellerId: j.sellerId || null,
      description: j.description || "",
    });
  }
  console.log(`  JournalEntries patched: ${jePatched} / ${allJournals.length}\n`);

  // ── Step 2: Re-patch every LedgerBalance.history entry ───────────────────
  console.log("Step 2 – Patching LedgerBalance history entries...");
  const allLedgers = await ledgersColl.find({}).toArray();

  let lbAccounts = 0;
  let lbEntries  = 0;

  for (const lb of allLedgers) {
    if (!Array.isArray(lb.history) || lb.history.length === 0) continue;

    const updatedHistory = lb.history.map((entry) => {
      const journalIdStr = entry.journalEntryId?.toString();
      const canonicalTxnId = journalIdStr
        ? journalTxnMap.get(journalIdStr)
        : null;

      // If we know the journal entry, use its canonical TXN id + meta
      if (canonicalTxnId) {
        const meta = journalMetaMap.get(journalIdStr);
        lbEntries++;
        return {
          ...entry,
          transactionId: canonicalTxnId,
          orderId: meta.orderId,
          paymentReference: meta.paymentReference,
          sellerId: meta.sellerId,
          description: meta.description,
        };
      }

      // No matching journal (orphan entry) – keep whatever it has or synthesise
      if (!entry.transactionId) {
        lbEntries++;
        return {
          ...entry,
          transactionId: stableTxnId(
            entry.eventId || entry.journalEntryId || lb.accountCode,
            entry.postedAt
          ),
        };
      }

      return entry; // already has transactionId from journal, no change needed
    });

    await ledgersColl.updateOne(
      { _id: lb._id },
      { $set: { history: updatedHistory } }
    );
    lbAccounts++;
    console.log(`  ✅ ${lb.accountCode} – ${lb.history.length} entries re-mapped`);
  }

  console.log(`\n Migration complete.`);
  console.log(`  JournalEntry documents backfilled : ${jePatched}`);
  console.log(`  LedgerBalance accounts patched    : ${lbAccounts}`);
  console.log(`  LedgerBalance history entries fixed: ${lbEntries}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
