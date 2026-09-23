import {
  parseManualJournalDraftInput,
  parseManualJournalPostInput,
  parseManualJournalReverseInput
} from "../validation/manualJournalSchema.js";
import {
  getManualJournalById,
  postManualJournal,
  reverseManualJournal,
  saveManualJournalDraft
} from "../services/manualJournalService.js";

const sendManualJournalError = (error, res, next) => {
  const message = String(error?.message ?? "Manual journal request failed");
  if (message.includes("not found")) {
    return res.status(404).json({ message });
  }
  if (
    message.includes("already") ||
    message.includes("must be POSTED") ||
    message.includes("cannot be edited")
  ) {
    return res.status(409).json({ message });
  }
  if (message.includes("Invalid") || message.includes("required") || message.includes("Unbalanced")) {
    return res.status(400).json({ message });
  }
  return next(error);
};

export const upsertManualJournalDraft = async (req, res, next) => {
  try {
    const payload = parseManualJournalDraftInput(req.body);
    const manualJournal = await saveManualJournalDraft(payload);
    res.status(201).json({
      message: "Manual journal draft saved",
      manualJournal
    });
  } catch (error) {
    sendManualJournalError(error, res, next);
  }
};

export const getManualJournal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const manualJournal = await getManualJournalById(id);
    if (!manualJournal) {
      return res.status(404).json({ message: `Manual journal ${id} not found` });
    }
    return res.json({ manualJournal });
  } catch (error) {
    return next(error);
  }
};

export const postManualJournalEntry = async (req, res, next) => {
  try {
    const { transactionId } = parseManualJournalPostInput(req.body);
    const manualJournal = await postManualJournal(transactionId);
    res.json({
      message: `Manual journal ${transactionId} posted`,
      manualJournal
    });
  } catch (error) {
    sendManualJournalError(error, res, next);
  }
};

export const reverseManualJournalEntry = async (req, res, next) => {
  try {
    const payload = parseManualJournalReverseInput(req.body);
    const result = await reverseManualJournal(payload);
    res.json({
      message: `Manual journal ${payload.transactionId} reversed`,
      ...result
    });
  } catch (error) {
    sendManualJournalError(error, res, next);
  }
};

