import { z } from "zod";
import { EVENT_TYPES } from "../constants/accounting.js";

const eventTypeValues = Object.values(EVENT_TYPES);

const basePayloadSchema = z.object({
  orderId: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  cogsAmount: z.number().nonnegative().optional(),
  refundAmount: z.number().nonnegative().optional(),
  marketplaceGross: z.number().nonnegative().optional(),
  marketplaceFees: z.number().nonnegative().optional(),
  marketplaceNet: z.number().nonnegative().optional(),
  purchaseAmount: z.number().nonnegative().optional(),
  inwardFreight: z.number().nonnegative().optional(),
  importDuties: z.number().nonnegative().optional(),
  totalPayable: z.number().nonnegative().optional(),
  supplierId: z.string().optional(),
  settlementId: z.string().optional(),
  reference: z.string().optional(),
  supplierPaymentAmount: z.number().nonnegative().optional(),
  expenseAmount: z.number().nonnegative().optional(),
  expenseAccountCode: z.string().optional(),
  sourceDocumentType: z.string().optional(),
  sourceDocumentId: z.string().optional(),
  metadata: z.record(z.any()).optional()
}).passthrough();

export const eventSchema = z.object({
  eventId: z.string().min(3),
  type: z.enum(eventTypeValues),
  timestamp: z.coerce.date(),
  source: z.string().default("ecommerce-backend"),
  payload: basePayloadSchema
});

export const validateEventInput = (input) => eventSchema.parse(input);

