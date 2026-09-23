import mongoose from "mongoose";
import { JournalEntryModel } from "../models/JournalEntry.js";
import { EventLogModel } from "../models/EventLog.js";
import { buildJournalDraftFromEvent } from "./ruleEngineService.js";
import { postJournalLinesToLedger } from "./ledgerService.js";

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message ?? "");
  return (
    message.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    message.includes("Standalone servers do not support transactions")
  );
};

export const processAccountingEvent = async (event) => {
  let journalEntry = null;
  let session = null;

  const applyAccountingFlow = async (activeSession) => {
    const sessionOption = activeSession ? { session: activeSession } : undefined;
    const existingProcessed = await EventLogModel.findOne({
      eventId: event.eventId,
      status: "PROCESSED"
    }).session(activeSession);

    if (existingProcessed) {
      return;
    }

    await EventLogModel.updateOne(
      { eventId: event.eventId },
      { $set: { status: "PROCESSING", failureReason: null } },
      { upsert: false, ...sessionOption }
    );

    const draft = await buildJournalDraftFromEvent(event);
    journalEntry = await JournalEntryModel.create([draft], sessionOption).then((docs) => docs[0]);
    await postJournalLinesToLedger(journalEntry, activeSession);

    await EventLogModel.updateOne(
      { eventId: event.eventId },
      {
        $set: {
          status: "PROCESSED",
          processedAt: new Date(),
          journalEntryId: journalEntry._id
        }
      },
      sessionOption
    );
  };

  try {
    session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await applyAccountingFlow(session);
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }
      await applyAccountingFlow(undefined);
    }

    return { journalEntryId: journalEntry?._id ?? null };
  } catch (error) {
    await EventLogModel.updateOne(
      { eventId: event.eventId },
      { $set: { status: "FAILED", failureReason: error.message } }
    );
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

