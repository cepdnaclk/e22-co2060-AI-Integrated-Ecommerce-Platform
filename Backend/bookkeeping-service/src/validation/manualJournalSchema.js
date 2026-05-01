import { z } from "zod";

const manualJournalLineSchema = z.object({
  debitAccountCode: z.string().trim().min(1),
  creditAccountCode: z.string().trim().min(1),
  amount: z.coerce.number().positive()
});

const manualJournalBaseSchema = z.object({
  transactionId: z.string().trim().min(3).max(120).optional(),
  date: z.coerce.date(),
  description: z.string().trim().min(3).max(500),
  referenceNo: z.string().trim().max(120).optional(),
  lines: z.array(manualJournalLineSchema).min(1)
});

export const manualJournalDraftSchema = manualJournalBaseSchema;

export const manualJournalPostSchema = z.object({
  transactionId: z.string().trim().min(3).max(120)
});

export const manualJournalReverseSchema = z.object({
  transactionId: z.string().trim().min(3).max(120),
  reversalTransactionId: z.string().trim().min(3).max(120).optional(),
  reversalDate: z.coerce.date().optional(),
  reason: z.string().trim().max(300).optional()
});

export const parseManualJournalDraftInput = (input) => manualJournalDraftSchema.parse(input);
export const parseManualJournalPostInput = (input) => manualJournalPostSchema.parse(input);
export const parseManualJournalReverseInput = (input) => manualJournalReverseSchema.parse(input);

