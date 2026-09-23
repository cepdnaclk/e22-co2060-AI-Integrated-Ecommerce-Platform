import AuditLog from "../models/auditLog.js";

export async function createAuditLog({
  category = "dms_ops",
  action,
  severity = "info",
  actor = {},
  context = {},
  metadata = {},
  req = null,
}) {
  if (!action) return null;

  return AuditLog.create({
    category,
    action,
    severity,
    actor: {
      actorType: actor.actorType || "system",
      userId: actor.userId || null,
      staffId: actor.staffId || null,
      role: actor.role || "",
    },
    context: {
      courierCompanyId: context.courierCompanyId || null,
      branchId: context.branchId || null,
      deliveryOrderId: context.deliveryOrderId || null,
      trackingNumber: context.trackingNumber || "",
      targetType: context.targetType || "",
      targetId: context.targetId || "",
    },
    metadata,
    ipAddress: req?.ip || "",
    userAgent: req?.headers?.["user-agent"] || "",
  });
}

