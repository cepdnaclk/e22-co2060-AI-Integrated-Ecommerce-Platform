import { createAuditLog } from "./auditService.js";

export async function emitDeliveryNotification({
  type,
  channel = "in_app",
  recipients = [],
  payload = {},
  actor = {},
  context = {},
  req = null,
}) {
  return createAuditLog({
    category: "notification",
    action: `notification.${type || "unknown"}`,
    severity: "info",
    actor,
    context,
    metadata: {
      channel,
      recipients,
      payload,
    },
    req,
  });
}

