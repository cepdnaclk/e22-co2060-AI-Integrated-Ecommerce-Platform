import DeliveryOrder from "../models/deliveryOrder.js";
import DeliveryAssignment from "../models/deliveryAssignment.js";
import ShipmentTrackingEvent from "../models/shipmentTrackingEvent.js";
import DeliveryDispute from "../models/deliveryDispute.js";
import CourierCompany from "../models/courierCompany.js";
import CourierBranch from "../models/courierBranch.js";
import CourierStaff from "../models/courierStaff.js";
import DeliveryRule from "../models/deliveryRule.js";
import ServiceZone from "../models/serviceZone.js";
import { withTenantScope } from "../middleware/dmsAccess.js";
import { generateTrackingNumber } from "../utils/idGenerator.js";
import { requireFields } from "../utils/validation.js";
import { assignBranchByRules, findServiceZone } from "../services/routingEngine.js";
import { detectScanAnomalies } from "../services/fraudService.js";
import { createAuditLog } from "../services/auditService.js";
import { emitDeliveryNotification } from "../services/notificationService.js";

function actorForAudit(req) {
  return {
    actorType: req.dmsActor?.actorType || "system",
    userId: req.dmsActor?.userId || null,
    staffId: req.dmsActor?.staffId || null,
    role: req.dmsActor?.actorRole || "",
  };
}

function scanTypeToStatus(scanType) {
  const statusMap = {
    branch_received: "received_at_branch",
    warehouse_sorted: "in_sorting",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    failed_delivery: "failed_delivery",
    returned: "returned",
  };
  return statusMap[scanType] || null;
}

async function evaluateCodVerificationRequirement({ courierCompanyId, destination, codAmount }) {
  if (!codAmount || codAmount <= 0) return false;

  const codRules = await DeliveryRule.find({
    scope: "cod_verification",
    isActive: true,
    $or: [{ courierCompanyId }, { courierCompanyId: null }],
  })
    .sort({ priority: 1 })
    .lean();

  return codRules.some((rule) => {
    const conditions = rule.conditions || {};
    if (conditions.province && conditions.province !== destination.province) return false;
    if (conditions.district && conditions.district !== destination.district) return false;
    if (conditions.minCodAmount !== null && conditions.minCodAmount !== undefined && codAmount < conditions.minCodAmount) return false;
    return true;
  });
}

function applyStatusTimeline(deliveryOrder, nextStatus) {
  const now = new Date();
  if (nextStatus === "received_at_branch") deliveryOrder.statusTimeline.receivedAtBranchAt = now;
  if (nextStatus === "in_sorting") deliveryOrder.statusTimeline.sortingStartedAt = now;
  if (nextStatus === "out_for_delivery") deliveryOrder.statusTimeline.outForDeliveryAt = now;
  if (nextStatus === "delivered") deliveryOrder.statusTimeline.deliveredAt = now;
  if (nextStatus === "failed_delivery") deliveryOrder.statusTimeline.failedAt = now;
  if (nextStatus === "returned") deliveryOrder.statusTimeline.returnedAt = now;
}

export async function createShipment(req, res) {
  try {
    const missing = requireFields(req.body, ["sellerId", "courierCompanyId", "destination"]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    if (req.dmsActor.scope === "seller" && req.dmsActor.sellerId !== req.body.sellerId) {
      return res.status(403).json({ message: "Sellers can only create their own shipments" });
    }

    const courierCompany = await CourierCompany.findOne({
      _id: req.body.courierCompanyId,
      status: "approved",
    }).lean();
    if (!courierCompany) {
      return res.status(400).json({ message: "Courier company is not approved or does not exist" });
    }

    const destination = req.body.destination || {};
    const codAmount = Number(req.body.cod?.amount || 0);
    const routingDecision = await assignBranchByRules({
      courierCompanyId: req.body.courierCompanyId,
      destination,
      codAmount,
    });
    if (!routingDecision.branch) {
      return res.status(400).json({ message: "No eligible branch found for destination" });
    }

    const zone = await findServiceZone({
      courierCompanyId: req.body.courierCompanyId,
      destination,
    });

    const requiresCodVerification = await evaluateCodVerificationRequirement({
      courierCompanyId: req.body.courierCompanyId,
      destination,
      codAmount,
    });

    const shipment = await DeliveryOrder.create({
      trackingNumber: req.body.trackingNumber || generateTrackingNumber(),
      ecommerceOrderId: req.body.ecommerceOrderId || null,
      sellerId: req.body.sellerId,
      customerId: req.body.customerId || null,
      courierCompanyId: req.body.courierCompanyId,
      assignedBranchId: routingDecision.branch._id,
      currentBranchId: routingDecision.branch._id,
      destination: req.body.destination,
      packageDetails: req.body.packageDetails || {},
      expectedDeliveryAt: req.body.expectedDeliveryAt || null,
      deliveryFee: Number(req.body.deliveryFee || 0),
      cod: {
        enabled: Boolean(req.body.cod?.enabled),
        amount: codAmount,
        requiresExtraVerification:
          Boolean(req.body.cod?.requiresExtraVerification) ||
          Boolean(routingDecision.requireExtraVerification) ||
          requiresCodVerification,
      },
      routing: {
        assignedByRuleId: routingDecision.assignedByRuleId,
        serviceZoneId: zone?._id || null,
        assignmentReason: routingDecision.assignmentReason,
        routePlan: req.body.routePlan || "",
      },
      createdByUserId: req.user.id,
    });

    await createAuditLog({
      category: "dms_workflow",
      action: "shipment.registered",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: shipment.courierCompanyId,
        branchId: shipment.assignedBranchId,
        deliveryOrderId: shipment._id,
        trackingNumber: shipment.trackingNumber,
        targetType: "delivery_order",
        targetId: `${shipment._id}`,
      },
      metadata: {
        assignmentReason: routingDecision.assignmentReason,
        serviceZoneId: zone?._id || null,
      },
      req,
    });

    await emitDeliveryNotification({
      type: "shipment_registered",
      recipients: [shipment.customerId, shipment.sellerId].filter(Boolean),
      payload: { trackingNumber: shipment.trackingNumber, status: shipment.status },
      actor: actorForAudit(req),
      context: { courierCompanyId: shipment.courierCompanyId, deliveryOrderId: shipment._id, trackingNumber: shipment.trackingNumber },
      req,
    });

    return res.status(201).json({ message: "Shipment created", shipment });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create shipment", error: error.message });
  }
}

export async function assignShipment(req, res) {
  try {
    const missing = requireFields(req.body, ["deliveryOrderId", "riderStaffId"]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    const order = await DeliveryOrder.findOne(withTenantScope(req, { _id: req.body.deliveryOrderId }));
    if (!order) {
      return res.status(404).json({ message: "Shipment not found in your scope" });
    }

    const rider = await CourierStaff.findOne({
      _id: req.body.riderStaffId,
      courierCompanyId: order.courierCompanyId,
      role: "delivery_rider",
      status: "active",
    }).lean();
    if (!rider) {
      return res.status(400).json({ message: "Rider is not active or not part of this courier" });
    }

    if (req.dmsActor.scope === "branch" && req.dmsActor.branchId && `${rider.assignedBranchId}` !== req.dmsActor.branchId) {
      return res.status(403).json({ message: "Branch users can only assign riders from their own branch" });
    }

    const activeCount = await DeliveryAssignment.countDocuments({
      riderStaffId: rider._id,
      status: "active",
    });

    await DeliveryAssignment.updateMany(
      { deliveryOrderId: order._id, status: "active" },
      { $set: { status: "cancelled", cancelledAt: new Date() } }
    );

    const assignment = await DeliveryAssignment.create({
      deliveryOrderId: order._id,
      courierCompanyId: order.courierCompanyId,
      branchId: rider.assignedBranchId || order.assignedBranchId,
      riderStaffId: rider._id,
      assignedByStaffId: req.dmsActor?.staffId || null,
      assignedByUserId: req.user.id,
      assignmentType: order.currentRiderId ? "reassign" : "assign",
      reason: req.body.reason || "",
      queuePosition: activeCount + 1,
      status: "active",
    });

    order.currentRiderId = rider._id;
    order.status = "out_for_delivery";
    applyStatusTimeline(order, "out_for_delivery");
    order.updatedByStaffId = req.dmsActor?.staffId || null;
    await order.save();

    await createAuditLog({
      category: "dms_workflow",
      action: "shipment.rider_assigned",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: order.courierCompanyId,
        branchId: assignment.branchId,
        deliveryOrderId: order._id,
        trackingNumber: order.trackingNumber,
      },
      metadata: { riderStaffId: rider._id, queuePosition: assignment.queuePosition },
      req,
    });

    await emitDeliveryNotification({
      type: "rider_assigned",
      recipients: [order.customerId, order.sellerId, rider.authUserId].filter(Boolean),
      payload: { trackingNumber: order.trackingNumber, riderStaffId: rider._id },
      actor: actorForAudit(req),
      context: { courierCompanyId: order.courierCompanyId, deliveryOrderId: order._id, trackingNumber: order.trackingNumber },
      req,
    });

    return res.json({ message: "Rider assigned", assignment, order });
  } catch (error) {
    return res.status(500).json({ message: "Failed to assign rider", error: error.message });
  }
}

export async function scanShipment(req, res) {
  try {
    const missing = requireFields(req.body, ["deliveryOrderId", "scanType"]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    const order = await DeliveryOrder.findOne(withTenantScope(req, { _id: req.body.deliveryOrderId }));
    if (!order) {
      return res.status(404).json({ message: "Shipment not found in your scope" });
    }

    const fraudCheck = await detectScanAnomalies({
      deliveryOrderId: order._id,
      scanType: req.body.scanType,
      scannedByStaffId: req.dmsActor?.staffId || null,
    });

    const nextStatus = scanTypeToStatus(req.body.scanType);
    if (nextStatus) {
      order.status = nextStatus;
      applyStatusTimeline(order, nextStatus);
    }

    if (req.body.branchId) {
      order.currentBranchId = req.body.branchId;
    }
    if (req.body.riderStaffId) {
      order.currentRiderId = req.body.riderStaffId;
    }

    order.scanSummary.lastScanType = req.body.scanType;
    order.scanSummary.lastScanAt = new Date();
    if (fraudCheck.anomalies.includes("duplicate_scan_detected")) {
      order.scanSummary.duplicateScanCount += 1;
    }
    if (fraudCheck.anomalies.includes("missing_scan_sequence")) {
      order.scanSummary.missingRequiredScans = true;
    }
    if (fraudCheck.suspicious) {
      order.risk.flags = Array.from(new Set([...(order.risk.flags || []), ...fraudCheck.anomalies]));
      order.risk.anomalyScore += fraudCheck.anomalyScore;
    }

    await order.save();

    const event = await ShipmentTrackingEvent.create({
      deliveryOrderId: order._id,
      trackingNumber: order.trackingNumber,
      courierCompanyId: order.courierCompanyId,
      branchId: req.body.branchId || order.currentBranchId || null,
      riderStaffId: req.body.riderStaffId || order.currentRiderId || null,
      scannedByStaffId: req.dmsActor?.staffId || null,
      scannedByUserId: req.user.id,
      scanType: req.body.scanType,
      scanMethod: req.body.scanMethod || "barcode",
      statusAfterScan: order.status,
      notes: req.body.notes || "",
      geolocation: req.body.geolocation || {},
      anomalyFlags: fraudCheck.anomalies,
      suspicious: fraudCheck.suspicious,
      occurredAt: req.body.occurredAt || new Date(),
      metadata: req.body.metadata || {},
    });

    if (order.status === "failed_delivery") {
      order.attempts.deliveryAttempts += 1;
      order.attempts.failedReason = req.body.notes || "Delivery failed";
      await order.save();
    }

    if (order.status === "delivered" || order.status === "returned") {
      await DeliveryAssignment.updateMany(
        { deliveryOrderId: order._id, status: "active" },
        { $set: { status: "completed", completedAt: new Date() } }
      );
    }

    if (fraudCheck.suspicious) {
      await createAuditLog({
        category: "dms_fraud",
        action: "shipment.scan_anomaly_detected",
        severity: "warn",
        actor: actorForAudit(req),
        context: {
          courierCompanyId: order.courierCompanyId,
          branchId: event.branchId,
          deliveryOrderId: order._id,
          trackingNumber: order.trackingNumber,
        },
        metadata: { anomalies: fraudCheck.anomalies },
        req,
      });
    }

    await emitDeliveryNotification({
      type: req.body.scanType,
      recipients: [order.customerId, order.sellerId].filter(Boolean),
      payload: {
        trackingNumber: order.trackingNumber,
        status: order.status,
        scanType: req.body.scanType,
      },
      actor: actorForAudit(req),
      context: { courierCompanyId: order.courierCompanyId, deliveryOrderId: order._id, trackingNumber: order.trackingNumber },
      req,
    });

    return res.json({
      message: "Scan recorded",
      order,
      event,
      fraud: fraudCheck,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to record scan", error: error.message });
  }
}

export async function getShipmentTracking(req, res) {
  try {
    const order = await DeliveryOrder.findOne({
      trackingNumber: req.params.trackingNumber,
    }).lean();
    if (!order) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const events = await ShipmentTrackingEvent.find({ deliveryOrderId: order._id })
      .sort({ occurredAt: 1 })
      .lean();

    return res.json({
      trackingNumber: order.trackingNumber,
      currentStatus: order.status,
      currentBranchId: order.currentBranchId,
      currentRiderId: order.currentRiderId,
      lastScan: order.scanSummary,
      movementHistory: events,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch tracking", error: error.message });
  }
}

export async function getRiderQueue(req, res) {
  try {
    const riderId = req.params.riderStaffId || req.dmsActor?.staffId;
    if (!riderId) return res.status(400).json({ message: "riderStaffId is required" });

    const rider = await CourierStaff.findById(riderId).lean();
    if (!rider || rider.role !== "delivery_rider") {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (req.dmsActor.scope === "company" && `${rider.courierCompanyId}` !== req.dmsActor.courierCompanyId) {
      return res.status(403).json({ message: "Cannot access rider queue outside your company" });
    }

    if (req.dmsActor.scope === "branch" && `${rider.assignedBranchId || ""}` !== req.dmsActor.branchId) {
      return res.status(403).json({ message: "Cannot access rider queue outside your branch" });
    }

    if (req.dmsActor.scope === "rider" && req.dmsActor.staffId !== riderId) {
      return res.status(403).json({ message: "Riders can only access their own queue" });
    }

    const assignments = await DeliveryAssignment.find(
      withTenantScope(
        req,
        {
          riderStaffId: riderId,
          status: "active",
        },
        {
          branchFields: ["branchId"],
          riderField: "riderStaffId",
        }
      )
    )
      .sort({ queuePosition: 1, assignedAt: 1 })
      .lean();

    return res.json({ count: assignments.length, assignments });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch rider queue", error: error.message });
  }
}

function applyShipmentViewFilter(filters, view) {
  if (view === "active") {
    filters.status = { $in: ["shipment_registered", "received_at_branch", "in_sorting", "out_for_delivery"] };
  }
  if (view === "delayed") {
    filters.expectedDeliveryAt = { $lt: new Date() };
    filters.status = { $nin: ["delivered", "returned"] };
  }
  if (view === "failed") {
    filters.status = "failed_delivery";
  }
  if (view === "returned") {
    filters.status = "returned";
  }
  if (view === "lost") {
    filters.status = "lost";
  }
}

export async function getCenterShipments(req, res) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    applyShipmentViewFilter(filters, req.query.view || "active");

    const scoped = withTenantScope(req, filters, {
      branchFields: ["assignedBranchId", "currentBranchId"],
    });
    const shipments = await DeliveryOrder.find(scoped).sort({ createdAt: -1 }).lean();
    return res.json({ count: shipments.length, shipments });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch center shipments", error: error.message });
  }
}

export async function getCenterRiderAssignments(req, res) {
  try {
    if (!req.dmsActor?.branchId) {
      return res.status(400).json({ message: "Center branch is not linked to this account" });
    }

    const filters = {
      status: "active",
      branchId: req.dmsActor.branchId,
    };

    if (req.dmsActor?.scope === "rider") {
      filters.riderStaffId = req.dmsActor.staffId;
    } else if (req.query.riderStaffId) {
      filters.riderStaffId = req.query.riderStaffId;
    }

    const assignments = await DeliveryAssignment.find(filters)
      .sort({ queuePosition: 1, assignedAt: 1 })
      .lean();

    return res.json({ count: assignments.length, assignments });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch center rider assignments", error: error.message });
  }
}

export async function getAdminShipments(req, res) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.courierCompanyId) filters.courierCompanyId = req.query.courierCompanyId;
    if (req.query.branchId) filters.assignedBranchId = req.query.branchId;

    applyShipmentViewFilter(filters, req.query.view);
    if (req.query.view === "disputed") {
      const disputedIds = await DeliveryDispute.find({ status: { $in: ["open", "investigating", "escalated"] } })
        .distinct("deliveryOrderId");
      filters._id = { $in: disputedIds };
    }

    const scoped = withTenantScope(req, filters);
    const shipments = await DeliveryOrder.find(scoped).sort({ createdAt: -1 }).lean();

    return res.json({
      count: shipments.length,
      shipments,
      metadata: {
        rulesConfigured: await DeliveryRule.countDocuments({ scope: "routing", isActive: true }),
        serviceZonesConfigured: await ServiceZone.countDocuments({ isActive: true }),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch shipments", error: error.message });
  }
}

