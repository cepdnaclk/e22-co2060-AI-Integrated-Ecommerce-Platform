import { validateEventInput } from "../validation/eventSchema.js";
import { enqueueEvent } from "../queue/enqueueEvent.js";
import { env } from "../config/env.js";
import { processEventWithIdempotency } from "../services/eventProcessorService.js";

export const postEvent = async (req, res, next) => {
  try {
    const event = validateEventInput(req.body);
    const result = await enqueueEvent(event);
    let processingResult = null;
    if (result.status === "recorded_no_queue" && !env.inlineEventProcessing) {
      throw new Error("Redis is unavailable and INLINE_EVENT_PROCESSING is disabled");
    }

    if (env.inlineEventProcessing) {
      processingResult = await processEventWithIdempotency(event);
    }

    return res.status(202).json({
      message: "Event accepted for bookkeeping processing",
      ...result,
      ...(processingResult ? { processing: processingResult } : {})
    });
  } catch (error) {
    return next(error);
  }
};

