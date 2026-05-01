import mongoose from "mongoose";

const eventLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    payloadHash: { type: String, required: true },
    source: { type: String, default: "api" },
    status: { type: String, enum: ["QUEUED", "PROCESSING", "PROCESSED", "FAILED"], default: "QUEUED", index: true },
    queuedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    idempotencyKey: { type: String, required: true, index: true },
    rawEvent: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true, versionKey: false }
);

eventLogSchema.index({ eventType: 1, createdAt: -1 });

export const EventLogModel = mongoose.model("EventLog", eventLogSchema);

