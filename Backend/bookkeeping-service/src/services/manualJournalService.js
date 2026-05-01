import crypto from "node:crypto";
import mongoose from "mongoose";
import { ENTRY_SIDES } from "../constants/accounting.js";
import { AccountModel } from "../models/Account.js";
import { JournalEntryModel } from "../models/JournalEntry.js";
import { ManualJournalEntryModel } from "../models/ManualJournalEntry.js";
import { redisDel } from "../config/redis.js";
import { postJournalLinesToLedger } from "./ledgerService.js";
import { toAmount } from "../utils/amount.js";

export const MANUAL_JOURNAL_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  REVERSED: "REVERSED"
});

const MANUAL_JOURNAL_EVENT_TYPES = Object.freeze({
  POST: "MANUAL_JOURNAL",
  REVERSAL: "MANUAL_JOURNAL_REVERSAL"
});

const normalizeText = (value, fieldName) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`Invalid ${fieldName}: value is required`);
  }
  return text;
};

const normalizeOptionalText = (value) => String(value ?? "").trim();

const normalizeDate = (value, fieldName = "date") => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date;
};

const generateTransactionId = (prefix) =>
  `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message ?? "");
  return (
    message.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
    message.includes("Standalone servers do not support transactions")
  );
};

const normalizeManualJournalLine = (line, index) => {
  const debitAccountCode = normalizeText(line?.debitAccountCode, `lines[${index}].debitAccountCode`);
  const creditAccountCode = normalizeText(line?.creditAccountCode, `lines[${index}].creditAccountCode`);
  if (debitAccountCode === creditAccountCode) {
    throw new Error(`Invalid lines[${index}]: debit and credit accounts must be different`);
  }
  const amount = toAmount(line?.amount, `lines[${index}].amount`);
  if (amount <= 0) {
    throw new Error(`Invalid lines[${index}].amount: amount must be greater than 0`);
  }

  return {
    debitAccountCode,
    creditAccountCode,
    amount
  };
};

const normalizeManualJournalLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Manual journal must contain at least one line");
  }

  const normalizedLines = lines.map((line, index) => normalizeManualJournalLine(line, index));
  const debitTotal = toAmount(normalizedLines.reduce((sum, line) => sum + line.amount, 0), "totalDebits");
  const creditTotal = toAmount(normalizedLines.reduce((sum, line) => sum + line.amount, 0), "totalCredits");

  if (debitTotal !== creditTotal) {
    throw new Error(`Unbalanced manual journal: debits=${debitTotal}, credits=${creditTotal}`);
  }

  return normalizedLines;
};

const ensureAccountsExist = async (lines, session) => {
  const accountCodes = [...new Set(lines.flatMap((line) => [line.debitAccountCode, line.creditAccountCode]))];
  let query = AccountModel.find({ code: { $in: accountCodes }, active: true }).select({ code: 1, _id: 0 });
  if (session) {
    query = query.session(session);
  }
  const existingAccounts = await query.lean();
  const existingCodes = new Set(existingAccounts.map((account) => account.code));
  const missingCodes = accountCodes.filter((code) => !existingCodes.has(code));

  if (missingCodes.length > 0) {
    throw new Error(`Accounts are missing or inactive: ${missingCodes.join(", ")}`);
  }
};

const clearReportCache = async () => {
  await redisDel("report:trial-balance", "report:profit-loss", "report:balance-sheet");
};

const buildManualJournalLineDraft = ({
  manualJournalEntry,
  line,
  lineIndex,
  eventType,
  reversalOfJournalEntryId = null
}) => {
  const entryLabel = eventType === MANUAL_JOURNAL_EVENT_TYPES.REVERSAL ? "REVERSAL" : "POST";
  const lineDescription = `${manualJournalEntry.description}${
    manualJournalEntry.referenceNo ? ` (${manualJournalEntry.referenceNo})` : ""
  }`;

  return {
    eventId: `manual:${manualJournalEntry.transactionId}:${entryLabel}:${lineIndex + 1}`,
    eventType,
    eventTimestamp: new Date(manualJournalEntry.date),
    sourceDocumentType:
      eventType === MANUAL_JOURNAL_EVENT_TYPES.REVERSAL
        ? "MANUAL_JOURNAL_REVERSAL"
        : "MANUAL_JOURNAL",
    sourceDocumentId: manualJournalEntry.transactionId,
    description: `${lineDescription} [line ${lineIndex + 1}]`,
    lines: [
      {
        side: ENTRY_SIDES.DEBIT,
        accountCode: line.debitAccountCode,
        amount: line.amount,
        narration: `Manual debit line ${lineIndex + 1}`
      },
      {
        side: ENTRY_SIDES.CREDIT,
        accountCode: line.creditAccountCode,
        amount: line.amount,
        narration: `Manual credit line ${lineIndex + 1}`
      }
    ],
    totalDebits: line.amount,
    totalCredits: line.amount,
    reversalOfJournalEntryId
  };
};

const postManualJournalLines = async ({
  manualJournalEntry,
  eventType,
  session,
  reversalOfJournalEntryIds = []
}) => {
  const journalEntryIds = [];

  for (let index = 0; index < manualJournalEntry.lines.length; index += 1) {
    const line = manualJournalEntry.lines[index];
    const draft = buildManualJournalLineDraft({
      manualJournalEntry,
      line,
      lineIndex: index,
      eventType,
      reversalOfJournalEntryId: reversalOfJournalEntryIds[index] ?? null
    });

    const createOptions = session ? { session } : undefined;
    const journalEntry = await JournalEntryModel.create([draft], createOptions).then((docs) => docs[0]);
    await postJournalLinesToLedger(journalEntry, session);
    journalEntryIds.push(journalEntry._id);
  }

  return journalEntryIds;
};

export const saveManualJournalDraft = async (payload) => {
  const transactionId = normalizeOptionalText(payload.transactionId) || generateTransactionId("MJE");
  const date = normalizeDate(payload.date);
  const description = normalizeText(payload.description, "description");
  const referenceNo = normalizeOptionalText(payload.referenceNo) || `MJR-${transactionId}`;
  const lines = normalizeManualJournalLines(payload.lines);

  await ensureAccountsExist(lines, undefined);

  const existing = await ManualJournalEntryModel.findOne({ transactionId });
  if (existing) {
    if (existing.status !== MANUAL_JOURNAL_STATUS.DRAFT) {
      throw new Error(`Manual journal ${transactionId} is already ${existing.status} and cannot be edited`);
    }
    existing.date = date;
    existing.description = description;
    existing.referenceNo = referenceNo;
    existing.lines = lines;
    await existing.save();
    return existing.toObject();
  }

  const created = await ManualJournalEntryModel.create({
    transactionId,
    date,
    description,
    referenceNo,
    status: MANUAL_JOURNAL_STATUS.DRAFT,
    lines
  });

  return created.toObject();
};

export const getManualJournalById = async (id) => {
  const lookup = normalizeText(id, "manual journal id");
  let manualJournalEntry = await ManualJournalEntryModel.findOne({ transactionId: lookup }).lean();
  if (!manualJournalEntry && mongoose.isValidObjectId(lookup)) {
    manualJournalEntry = await ManualJournalEntryModel.findById(lookup).lean();
  }
  return manualJournalEntry;
};

export const postManualJournal = async (transactionIdInput) => {
  const transactionId = normalizeText(transactionIdInput, "transactionId");
  let session = null;

  const applyPosting = async (activeSession) => {
    let query = ManualJournalEntryModel.findOne({ transactionId });
    if (activeSession) {
      query = query.session(activeSession);
    }
    const manualJournalEntry = await query;

    if (!manualJournalEntry) {
      throw new Error(`Manual journal ${transactionId} not found`);
    }
    if (manualJournalEntry.status === MANUAL_JOURNAL_STATUS.POSTED) {
      throw new Error(`Manual journal ${transactionId} is already posted`);
    }
    if (manualJournalEntry.status === MANUAL_JOURNAL_STATUS.REVERSED) {
      throw new Error(`Manual journal ${transactionId} is already reversed`);
    }

    const normalizedLines = normalizeManualJournalLines(manualJournalEntry.lines);
    manualJournalEntry.lines = normalizedLines;
    await ensureAccountsExist(normalizedLines, activeSession);

    const journalEntryIds = await postManualJournalLines({
      manualJournalEntry,
      eventType: MANUAL_JOURNAL_EVENT_TYPES.POST,
      session: activeSession
    });

    manualJournalEntry.status = MANUAL_JOURNAL_STATUS.POSTED;
    manualJournalEntry.postedAt = new Date();
    manualJournalEntry.journalEntryIds = journalEntryIds;
    await manualJournalEntry.save(activeSession ? { session: activeSession } : undefined);
  };

  try {
    session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await applyPosting(session);
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }
      await applyPosting(undefined);
    }

    await clearReportCache();
    return ManualJournalEntryModel.findOne({ transactionId }).lean();
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const reverseManualJournal = async ({
  transactionId: transactionIdInput,
  reversalTransactionId: reversalTransactionIdInput,
  reversalDate,
  reason
}) => {
  const transactionId = normalizeText(transactionIdInput, "transactionId");
  const reversalTransactionId =
    normalizeOptionalText(reversalTransactionIdInput) || generateTransactionId(`REV-${transactionId}`);
  const reverseDate = normalizeDate(reversalDate, "reversalDate");
  const reverseReason = normalizeOptionalText(reason);
  let session = null;

  const applyReversal = async (activeSession) => {
    let originalQuery = ManualJournalEntryModel.findOne({ transactionId });
    if (activeSession) {
      originalQuery = originalQuery.session(activeSession);
    }
    const originalEntry = await originalQuery;

    if (!originalEntry) {
      throw new Error(`Manual journal ${transactionId} not found`);
    }
    if (originalEntry.status !== MANUAL_JOURNAL_STATUS.POSTED) {
      throw new Error(
        `Manual journal ${transactionId} must be POSTED before reversal (current: ${originalEntry.status})`
      );
    }
    if (originalEntry.reversedByTransactionId) {
      throw new Error(`Manual journal ${transactionId} was already reversed by ${originalEntry.reversedByTransactionId}`);
    }

    let reversalIdQuery = ManualJournalEntryModel.findOne({ transactionId: reversalTransactionId }).select({ _id: 1 });
    if (activeSession) {
      reversalIdQuery = reversalIdQuery.session(activeSession);
    }
    const conflict = await reversalIdQuery.lean();
    if (conflict) {
      throw new Error(`Reversal transaction id already exists: ${reversalTransactionId}`);
    }

    const reversalLines = normalizeManualJournalLines(
      originalEntry.lines.map((line) => ({
        debitAccountCode: line.creditAccountCode,
        creditAccountCode: line.debitAccountCode,
        amount: line.amount
      }))
    );
    await ensureAccountsExist(reversalLines, activeSession);

    const reversalEntry = await ManualJournalEntryModel.create(
      [
        {
          transactionId: reversalTransactionId,
          date: reverseDate,
          description: `Reversal of ${originalEntry.transactionId}${
            reverseReason ? ` - ${reverseReason}` : ` - ${originalEntry.description}`
          }`,
          referenceNo: originalEntry.referenceNo
            ? `${originalEntry.referenceNo}-REV`
            : `MJR-${reversalTransactionId}`,
          status: MANUAL_JOURNAL_STATUS.POSTED,
          lines: reversalLines,
          postedAt: new Date(),
          reversalOfTransactionId: originalEntry.transactionId
        }
      ],
      activeSession ? { session: activeSession } : undefined
    ).then((docs) => docs[0]);

    const reversalJournalEntryIds = await postManualJournalLines({
      manualJournalEntry: reversalEntry,
      eventType: MANUAL_JOURNAL_EVENT_TYPES.REVERSAL,
      session: activeSession,
      reversalOfJournalEntryIds: originalEntry.journalEntryIds ?? []
    });

    reversalEntry.journalEntryIds = reversalJournalEntryIds;
    await reversalEntry.save(activeSession ? { session: activeSession } : undefined);

    originalEntry.status = MANUAL_JOURNAL_STATUS.REVERSED;
    originalEntry.reversedAt = new Date();
    originalEntry.reversedByTransactionId = reversalTransactionId;
    await originalEntry.save(activeSession ? { session: activeSession } : undefined);
  };

  try {
    session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await applyReversal(session);
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }
      await applyReversal(undefined);
    }

    await clearReportCache();
    const [original, reversal] = await Promise.all([
      ManualJournalEntryModel.findOne({ transactionId }).lean(),
      ManualJournalEntryModel.findOne({ transactionId: reversalTransactionId }).lean()
    ]);

    return { original, reversal };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

