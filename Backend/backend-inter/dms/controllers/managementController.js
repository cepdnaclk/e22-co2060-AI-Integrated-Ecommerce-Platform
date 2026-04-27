import DeliveryRule from "../models/deliveryRule.js";
import DeliveryDispute from "../models/deliveryDispute.js";
import DeliveryOrder from "../models/deliveryOrder.js";
import DeliverySettlement from "../models/deliverySettlement.js";
import DeliveryAssignment from "../models/deliveryAssignment.js";
import ServiceZone from "../models/serviceZone.js";
import CourierCompany from "../models/courierCompany.js";
import CourierBranch from "../models/courierBranch.js";
import CourierStaff from "../models/courierStaff.js";
import ShipmentTrackingEvent from "../models/shipmentTrackingEvent.js";
import { withTenantScope } from "../middleware/dmsAccess.js";
import { createAuditLog } from "../services/auditService.js";
import { getSuperAdminDashboard, getCourierDashboard, getBranchDashboard } from "../services/dashboardService.js";
import { generateCode } from "../utils/idGenerator.js";
import { requireFields } from "../utils/validation.js";

function actorForAudit(req) {
  return {
    actorType: req.dmsActor?.actorType || "system",
    userId: req.dmsActor?.userId || null,
    staffId: req.dmsActor?.staffId || null,
    role: req.dmsActor?.actorRole || "",
  };
}

function toKey(value) {
  return value ? `${value}` : "";
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getPortalProfile(req, res) {
  try {
    if (req.dmsActor?.actorType !== "dms_staff") {
      return res.status(403).json({ message: "Not a registered delivery staff account" });
    }

    const centerPortalRoles = new Set([
      "branch_manager",
      "dispatch_operator",
      "warehouse_staff",
      "delivery_rider",
    ]);
    if (!centerPortalRoles.has(req.dmsActor?.actorRole)) {
      return res.status(403).json({
        message: "Delivery center portal access is allowed only for center staff roles",
      });
    }

    const staff = await CourierStaff.findById(req.dmsActor.staffId).lean();
    if (!staff || staff.status !== "active") {
      return res.status(403).json({ message: "Delivery staff account is inactive" });
    }

    const [company, branch] = await Promise.all([
      CourierCompany.findById(staff.courierCompanyId).lean(),
      staff.assignedBranchId ? CourierBranch.findById(staff.assignedBranchId).lean() : Promise.resolve(null),
    ]);

    if (!company) {
      return res.status(403).json({ message: "Delivery company is not linked to this account" });
    }
    if (company.status !== "approved") {
      return res.status(403).json({ message: "Delivery company is not approved for portal access" });
    }
    if (!branch) {
      return res.status(403).json({ message: "Delivery center is not linked to this account" });
    }
    if (branch.status !== "approved") {
      return res.status(403).json({ message: "Delivery center is not approved for portal access" });
    }

    const dashboardRoute = "/dms/center/dashboard";

    return res.json({
      actor: req.dmsActor,
      staff: {
        id: staff._id,
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        role: staff.role,
        status: staff.status,
      },
      courierCompany: company
        ? {
            id: company._id,
            companyName: company.companyName,
            registrationNumber: company.registrationNumber,
            status: company.status,
          }
        : null,
      branch: branch
        ? {
            id: branch._id,
            branchCode: branch.branchCode,
            branchName: branch.branchName,
            district: branch.district,
            city: branch.city,
            status: branch.status,
          }
        : null,
      dashboardRoute,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve DMS portal profile", error: error.message });
  }
}

export async function createRoutingRule(req, res) {
  try {
    const missing = requireFields(req.body, ["ruleName", "scope"]);
    if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });

    if (req.dmsActor.scope === "company" && req.body.courierCompanyId && req.body.courierCompanyId !== req.dmsActor.courierCompanyId) {
      return res.status(403).json({ message: "Cannot create rules for another courier company" });
    }

    const rule = await DeliveryRule.create({
      ruleName: req.body.ruleName,
      description: req.body.description || "",
      scope: req.body.scope,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      priority: Number(req.body.priority || 100),
      courierCompanyId: req.body.courierCompanyId || (req.dmsActor.scope === "company" ? req.dmsActor.courierCompanyId : null),
      conditions: req.body.conditions || {},
      actions: req.body.actions || {},
      createdByUserId: req.user.id,
    });

    await createAuditLog({
      category: "dms_ops",
      action: "rule.created",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: rule.courierCompanyId,
        targetType: "delivery_rule",
        targetId: `${rule._id}`,
      },
      metadata: { scope: rule.scope, priority: rule.priority },
      req,
    });

    return res.status(201).json({ message: "Delivery rule created", rule });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create delivery rule", error: error.message });
  }
}

export async function listRoutingRules(req, res) {
  try {
    const filter = {};
    if (req.query.scope) filter.scope = req.query.scope;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    if (req.query.courierCompanyId) filter.courierCompanyId = req.query.courierCompanyId;
    if (req.dmsActor.scope === "company") filter.courierCompanyId = req.dmsActor.courierCompanyId;

    const rules = await DeliveryRule.find(filter).sort({ priority: 1, createdAt: -1 }).lean();
    return res.json({ count: rules.length, rules });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch delivery rules", error: error.message });
  }
}

export async function createServiceZone(req, res) {
  try {
    const missing = requireFields(req.body, ["zoneCode", "zoneName", "zoneType"]);
    if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });

    const zone = await ServiceZone.create({
      zoneCode: req.body.zoneCode,
      zoneName: req.body.zoneName,
      courierCompanyId: req.body.courierCompanyId || (req.dmsActor.scope === "company" ? req.dmsActor.courierCompanyId : null),
      branchId: req.body.branchId || null,
      zoneType: req.body.zoneType,
      province: req.body.province || "",
      district: req.body.district || "",
      city: req.body.city || "",
      postalCodes: req.body.postalCodes || [],
      center: req.body.center || {},
      radiusKm: req.body.radiusKm ?? null,
      polygonCoordinates: req.body.polygonCoordinates || [],
      restricted: Boolean(req.body.restricted),
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      priority: Number(req.body.priority || 100),
      notes: req.body.notes || "",
      createdByUserId: req.user.id,
    });

    return res.status(201).json({ message: "Service zone created", zone });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create service zone", error: error.message });
  }
}

export async function listServiceZones(req, res) {
  try {
    const filter = {};
    if (req.query.courierCompanyId) filter.courierCompanyId = req.query.courierCompanyId;
    if (req.query.zoneType) filter.zoneType = req.query.zoneType;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    if (req.dmsActor.scope === "company") filter.courierCompanyId = req.dmsActor.courierCompanyId;

    const zones = await ServiceZone.find(filter).sort({ priority: 1 }).lean();
    return res.json({ count: zones.length, zones });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch service zones", error: error.message });
  }
}

export async function createDispute(req, res) {
  try {
    const missing = requireFields(req.body, ["deliveryOrderId", "disputeType", "title"]);
    if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });

    const order = await DeliveryOrder.findOne(withTenantScope(req, { _id: req.body.deliveryOrderId })).lean();
    if (!order) {
      return res.status(404).json({ message: "Shipment not found in your scope" });
    }

    const dispute = await DeliveryDispute.create({
      disputeCode: generateCode("DSP"),
      deliveryOrderId: order._id,
      trackingNumber: order.trackingNumber,
      courierCompanyId: order.courierCompanyId,
      branchId: order.currentBranchId || order.assignedBranchId || null,
      disputeType: req.body.disputeType,
      raisedByType: req.dmsActor.actorType === "seller" ? "seller" : req.dmsActor.actorType === "dms_staff" ? "courier_staff" : "platform_admin",
      raisedByUserId: req.user.id,
      raisedByStaffId: req.dmsActor.staffId || null,
      title: req.body.title,
      description: req.body.description || "",
      priority: req.body.priority || "medium",
      evidence: req.body.evidence || [],
    });

    order.status = "disputed";
    await order.save();

    await createAuditLog({
      category: "dms_ops",
      action: "dispute.created",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: order.courierCompanyId,
        branchId: order.currentBranchId,
        deliveryOrderId: order._id,
        trackingNumber: order.trackingNumber,
        targetType: "delivery_dispute",
        targetId: `${dispute._id}`,
      },
      metadata: { disputeType: dispute.disputeType, priority: dispute.priority },
      req,
    });

    return res.status(201).json({ message: "Dispute opened", dispute });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create dispute", error: error.message });
  }
}

export async function listDisputes(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.courierCompanyId) filter.courierCompanyId = req.query.courierCompanyId;
    const disputes = await DeliveryDispute.find(
      withTenantScope(req, filter, {
        branchFields: ["branchId"],
      })
    )
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ count: disputes.length, disputes });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch disputes", error: error.message });
  }
}

export async function updateDispute(req, res) {
  try {
    const dispute = await DeliveryDispute.findById(req.params.disputeId);
    if (!dispute) return res.status(404).json({ message: "Dispute not found" });
    if (req.dmsActor.scope === "company" && `${dispute.courierCompanyId}` !== req.dmsActor.courierCompanyId) {
      return res.status(403).json({ message: "Cannot update dispute outside your company" });
    }

    if (req.body.status) dispute.status = req.body.status;
    if (req.body.priority) dispute.priority = req.body.priority;
    if (req.body.assignedInvestigatorStaffId !== undefined) dispute.assignedInvestigatorStaffId = req.body.assignedInvestigatorStaffId || null;
    if (req.body.resolution) {
      dispute.resolution.decision = req.body.resolution.decision || dispute.resolution.decision;
      dispute.resolution.remarks = req.body.resolution.remarks || dispute.resolution.remarks;
      if (req.body.status === "resolved") {
        dispute.resolution.resolvedAt = new Date();
        dispute.resolution.resolvedByUserId = req.user.id;
      }
    }
    await dispute.save();

    return res.json({ message: "Dispute updated", dispute });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update dispute", error: error.message });
  }
}

export async function createSettlement(req, res) {
  try {
    const missing = requireFields(req.body, ["deliveryOrderId", "codAmount"]);
    if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });

    const order = await DeliveryOrder.findOne(withTenantScope(req, { _id: req.body.deliveryOrderId })).lean();
    if (!order) return res.status(404).json({ message: "Shipment not found" });
    if (req.dmsActor.scope === "branch" && req.dmsActor.branchId && `${order.currentBranchId || order.assignedBranchId}` !== req.dmsActor.branchId) {
      return res.status(403).json({ message: "Cannot create settlement outside your branch" });
    }

    const settlement = await DeliverySettlement.create({
      settlementCode: generateCode("SET"),
      deliveryOrderId: order._id,
      trackingNumber: order.trackingNumber,
      courierCompanyId: order.courierCompanyId,
      branchId: order.currentBranchId || order.assignedBranchId,
      riderStaffId: order.currentRiderId || null,
      sellerId: order.sellerId,
      codAmount: Number(req.body.codAmount || 0),
      shippingFee: Number(req.body.shippingFee || order.deliveryFee || 0),
      codFee: Number(req.body.codFee || 0),
      platformCommission: Number(req.body.platformCommission || 0),
      state: req.body.state || "rider_collected",
      timeline: req.body.timeline || {},
      reconciliation: {
        expectedAmount: Number(req.body.expectedAmount || req.body.codAmount || 0),
        receivedAmount: Number(req.body.receivedAmount || 0),
        variance: Number(req.body.receivedAmount || 0) - Number(req.body.expectedAmount || req.body.codAmount || 0),
        reconciledByUserId: req.body.reconciled ? req.user.id : null,
        reconciledAt: req.body.reconciled ? new Date() : null,
        notes: req.body.notes || "",
      },
      flaggedReason: req.body.flaggedReason || "",
    });

    return res.status(201).json({ message: "Settlement record created", settlement });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create settlement", error: error.message });
  }
}

export async function updateSettlementState(req, res) {
  try {
    const settlement = await DeliverySettlement.findById(req.params.settlementId);
    if (!settlement) return res.status(404).json({ message: "Settlement not found" });
    if (req.dmsActor.scope === "company" && `${settlement.courierCompanyId}` !== req.dmsActor.courierCompanyId) {
      return res.status(403).json({ message: "Cannot update settlement outside your company" });
    }
    if (req.dmsActor.scope === "branch" && req.dmsActor.branchId && `${settlement.branchId}` !== req.dmsActor.branchId) {
      return res.status(403).json({ message: "Cannot update settlement outside your branch" });
    }

    settlement.state = req.body.state || settlement.state;
    if (req.body.receivedAmount !== undefined) {
      settlement.reconciliation.receivedAmount = Number(req.body.receivedAmount);
      settlement.reconciliation.variance =
        settlement.reconciliation.receivedAmount - settlement.reconciliation.expectedAmount;
    }
    if (req.body.notes !== undefined) {
      settlement.reconciliation.notes = req.body.notes;
    }

    const now = new Date();
    if (settlement.state === "rider_collected") settlement.timeline.riderCollectedAt = settlement.timeline.riderCollectedAt || now;
    if (settlement.state === "branch_received") settlement.timeline.branchReceivedAt = settlement.timeline.branchReceivedAt || now;
    if (settlement.state === "platform_settled") settlement.timeline.platformSettledAt = settlement.timeline.platformSettledAt || now;
    if (settlement.state === "seller_paid") settlement.timeline.sellerPaidAt = settlement.timeline.sellerPaidAt || now;
    if (settlement.state === "flagged") settlement.flaggedReason = req.body.flaggedReason || settlement.flaggedReason;

    settlement.reconciliation.reconciledByUserId = req.user.id;
    settlement.reconciliation.reconciledAt = now;
    await settlement.save();

    return res.json({ message: "Settlement state updated", settlement });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update settlement", error: error.message });
  }
}

export async function listSettlements(req, res) {
  try {
    const filter = {};
    if (req.query.state) filter.state = req.query.state;
    if (req.query.courierCompanyId) filter.courierCompanyId = req.query.courierCompanyId;
    if (req.query.sellerId) filter.sellerId = req.query.sellerId;
    const settlements = await DeliverySettlement.find(
      withTenantScope(req, filter, {
        branchFields: ["branchId"],
        riderField: "riderStaffId",
      })
    )
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ count: settlements.length, settlements });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch settlements", error: error.message });
  }
}

export async function getAdminCenterControlTower(req, res) {
  try {
    const maxOrdersPerCenter = Math.min(Math.max(safeNumber(req.query.maxOrdersPerCenter) || 15, 1), 50);
    const maxOrdersPerRider = Math.min(Math.max(safeNumber(req.query.maxOrdersPerRider) || 5, 1), 20);

    const [companies, branches] = await Promise.all([
      CourierCompany.find({}).sort({ createdAt: -1 }).lean(),
      CourierBranch.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    const companyMap = new Map(companies.map((item) => [toKey(item._id), item]));
    const branchIds = branches.map((item) => item._id);
    const managerIds = branches.map((item) => item.managerStaffId).filter(Boolean);

    const [managers, riders, orderStats, delayedOrders] = await Promise.all([
      managerIds.length
        ? CourierStaff.find({ _id: { $in: managerIds } }).lean()
        : Promise.resolve([]),
      branchIds.length
        ? CourierStaff.find({
            assignedBranchId: { $in: branchIds },
            role: "delivery_rider",
          })
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
      branchIds.length
        ? DeliveryOrder.aggregate([
            { $match: { assignedBranchId: { $in: branchIds } } },
            {
              $group: {
                _id: { branchId: "$assignedBranchId", status: "$status" },
                count: { $sum: 1 },
              },
            },
          ])
        : Promise.resolve([]),
      branchIds.length
        ? DeliveryOrder.aggregate([
            {
              $match: {
                assignedBranchId: { $in: branchIds },
                expectedDeliveryAt: { $lt: new Date() },
                status: { $nin: ["delivered", "returned"] },
              },
            },
            { $group: { _id: "$assignedBranchId", count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
    ]);

    const riderIds = riders.map((item) => item._id);
    const [activeAssignments, activeOrders, latestRiderEvents] = await Promise.all([
      branchIds.length
        ? DeliveryAssignment.find({
            branchId: { $in: branchIds },
            status: "active",
          })
            .sort({ queuePosition: 1, assignedAt: 1 })
            .lean()
        : Promise.resolve([]),
      branchIds.length
        ? DeliveryOrder.find({
            assignedBranchId: { $in: branchIds },
            status: { $in: ["shipment_registered", "received_at_branch", "in_sorting", "out_for_delivery"] },
          })
            .sort({ updatedAt: -1 })
            .select("_id trackingNumber assignedBranchId currentRiderId status expectedDeliveryAt destination scanSummary updatedAt")
            .lean()
        : Promise.resolve([]),
      riderIds.length
        ? ShipmentTrackingEvent.aggregate([
            { $match: { riderStaffId: { $in: riderIds } } },
            { $sort: { occurredAt: -1 } },
            {
              $group: {
                _id: "$riderStaffId",
                latestEvent: { $first: "$$ROOT" },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const managerMap = new Map(managers.map((item) => [toKey(item._id), item]));
    const ridersByBranch = new Map();
    riders.forEach((item) => {
      const key = toKey(item.assignedBranchId);
      if (!ridersByBranch.has(key)) ridersByBranch.set(key, []);
      ridersByBranch.get(key).push(item);
    });

    const orderStatusByBranch = new Map();
    orderStats.forEach((entry) => {
      const branchId = toKey(entry?._id?.branchId);
      const status = entry?._id?.status || "unknown";
      const count = safeNumber(entry?.count);
      if (!orderStatusByBranch.has(branchId)) {
        orderStatusByBranch.set(branchId, {});
      }
      orderStatusByBranch.get(branchId)[status] = count;
    });

    const delayedByBranch = new Map(
      delayedOrders.map((entry) => [toKey(entry._id), safeNumber(entry.count)])
    );

    const assignmentsByRider = new Map();
    const assignmentsByBranch = new Map();
    activeAssignments.forEach((item) => {
      const riderKey = toKey(item.riderStaffId);
      const branchKey = toKey(item.branchId);
      if (!assignmentsByRider.has(riderKey)) assignmentsByRider.set(riderKey, []);
      if (!assignmentsByBranch.has(branchKey)) assignmentsByBranch.set(branchKey, []);
      assignmentsByRider.get(riderKey).push(item);
      assignmentsByBranch.get(branchKey).push(item);
    });

    const activeOrdersByBranch = new Map();
    activeOrders.forEach((item) => {
      const branchKey = toKey(item.assignedBranchId);
      if (!activeOrdersByBranch.has(branchKey)) activeOrdersByBranch.set(branchKey, []);
      activeOrdersByBranch.get(branchKey).push(item);
    });

    const latestEventByRider = new Map(
      latestRiderEvents.map((entry) => [toKey(entry._id), entry.latestEvent])
    );

    const centers = branches.map((branch) => {
      const branchId = toKey(branch._id);
      const company = companyMap.get(toKey(branch.courierCompanyId)) || null;
      const manager = managerMap.get(toKey(branch.managerStaffId)) || null;
      const centerRiders = ridersByBranch.get(branchId) || [];
      const centerAssignments = assignmentsByBranch.get(branchId) || [];
      const statusCounts = orderStatusByBranch.get(branchId) || {};

      const branchActiveOrders = activeOrdersByBranch.get(branchId) || [];
      const branchActiveOrderMap = new Map(
        branchActiveOrders.map((order) => [toKey(order._id), order])
      );
      const activeCenterOrders = branchActiveOrders
        .slice(0, maxOrdersPerCenter)
        .map((order) => ({
          id: order._id,
          trackingNumber: order.trackingNumber,
          status: order.status,
          expectedDeliveryAt: order.expectedDeliveryAt,
          destination: order.destination,
          currentRiderId: order.currentRiderId,
          lastScan: order.scanSummary?.lastScanType || "",
          lastScanAt: order.scanSummary?.lastScanAt || null,
          updatedAt: order.updatedAt,
        }));

      const ridersPayload = centerRiders.map((rider) => {
        const riderId = toKey(rider._id);
        const riderAssignments = assignmentsByRider.get(riderId) || [];
        const latestEvent = latestEventByRider.get(riderId) || null;
        const geo = latestEvent?.geolocation || null;
        const hasGeo = Number.isFinite(Number(geo?.lat)) && Number.isFinite(Number(geo?.lng));

        const activeRiderOrders = riderAssignments
          .map((assignment) => branchActiveOrderMap.get(toKey(assignment.deliveryOrderId)))
          .filter(Boolean)
          .slice(0, maxOrdersPerRider);

        return {
          id: rider._id,
          employeeId: rider.employeeId,
          fullName: rider.fullName,
          role: rider.role,
          email: rider.email,
          phone: rider.phone,
          status: rider.status,
          availability: rider.availability || {},
          performance: rider.performance || {},
          currentStatus: riderAssignments.length > 0 ? "assigned" : rider.status === "active" ? "idle" : rider.status,
          currentLocation: hasGeo
            ? {
                source: "tracking_event",
                lat: Number(geo.lat),
                lng: Number(geo.lng),
                accuracy: Number.isFinite(Number(geo?.accuracy)) ? Number(geo.accuracy) : null,
                scanType: latestEvent.scanType,
                scanAt: latestEvent.occurredAt,
              }
            : {
                source: "branch_center",
                city: branch.city,
                district: branch.district,
                address: branch.address,
              },
          workload: {
            activeAssignments: riderAssignments.length,
            earliestQueuePosition:
              riderAssignments.length > 0
                ? Math.min(...riderAssignments.map((item) => safeNumber(item.queuePosition)))
                : 0,
            activeOrders: activeRiderOrders.length,
          },
          activeOrders: activeRiderOrders.map((order) => ({
            id: order._id,
            trackingNumber: order.trackingNumber,
            status: order.status,
            destination: order.destination,
            expectedDeliveryAt: order.expectedDeliveryAt,
            lastScan: order.scanSummary?.lastScanType || "",
            lastScanAt: order.scanSummary?.lastScanAt || null,
          })),
          lastTrackingEvent: latestEvent
            ? {
                scanType: latestEvent.scanType,
                occurredAt: latestEvent.occurredAt,
                suspicious: latestEvent.suspicious,
              }
            : null,
        };
      });

      const riderSummary = centerRiders.reduce(
        (acc, rider) => {
          acc.total += 1;
          if (rider.status === "active") acc.active += 1;
          if (rider.status === "pending") acc.pending += 1;
          if (rider.status === "suspended") acc.suspended += 1;
          if (rider.availability?.isOnline) acc.online += 1;
          return acc;
        },
        { total: 0, active: 0, pending: 0, suspended: 0, online: 0 }
      );

      const centerStatus = branch.status;
      const companyStatus = company?.status || "unknown";
      const operationalState =
        centerStatus === "approved" && companyStatus === "approved"
          ? "operational"
          : centerStatus === "disabled" || companyStatus === "suspended"
            ? "suspended"
            : "pending_verification";

      return {
        branchId: branch._id,
        centerCode: branch.branchCode,
        centerName: branch.branchName,
        district: branch.district,
        city: branch.city,
        province: branch.province,
        address: branch.address,
        postalCode: branch.postalCode,
        centerStatus,
        operationalState,
        company: company
          ? {
              id: company._id,
              companyName: company.companyName,
              registrationNumber: company.registrationNumber,
              status: company.status,
              businessLicenseVerified: company.businessLicenseVerified,
            }
          : null,
        manager: manager
          ? {
              id: manager._id,
              fullName: manager.fullName,
              employeeId: manager.employeeId,
              email: manager.email,
              phone: manager.phone,
              status: manager.status,
            }
          : null,
        riderSummary,
        orderSummary: {
          total: Object.values(statusCounts).reduce((sum, count) => sum + safeNumber(count), 0),
          active:
            safeNumber(statusCounts.shipment_registered) +
            safeNumber(statusCounts.received_at_branch) +
            safeNumber(statusCounts.in_sorting) +
            safeNumber(statusCounts.out_for_delivery),
          outForDelivery: safeNumber(statusCounts.out_for_delivery),
          delivered: safeNumber(statusCounts.delivered),
          failed: safeNumber(statusCounts.failed_delivery),
          returned: safeNumber(statusCounts.returned),
          delayed: safeNumber(delayedByBranch.get(branchId)),
          activeAssignments: centerAssignments.length,
        },
        activeOrders: activeCenterOrders,
        riders: ridersPayload,
      };
    });

    const totals = centers.reduce(
      (acc, center) => {
        acc.centers += 1;
        if (center.centerStatus === "approved") acc.approvedCenters += 1;
        if (center.centerStatus === "pending") acc.pendingCenters += 1;
        if (center.centerStatus === "disabled") acc.disabledCenters += 1;
        acc.riders += center.riderSummary.total;
        acc.activeRiders += center.riderSummary.active;
        acc.pendingRiders += center.riderSummary.pending;
        acc.suspendedRiders += center.riderSummary.suspended;
        acc.activeShipments += center.orderSummary.active;
        acc.outForDelivery += center.orderSummary.outForDelivery;
        acc.delayedShipments += center.orderSummary.delayed;
        return acc;
      },
      {
        centers: 0,
        approvedCenters: 0,
        pendingCenters: 0,
        disabledCenters: 0,
        riders: 0,
        activeRiders: 0,
        pendingRiders: 0,
        suspendedRiders: 0,
        activeShipments: 0,
        outForDelivery: 0,
        delayedShipments: 0,
      }
    );

    return res.json({
      generatedAt: new Date().toISOString(),
      totals,
      centers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch center control tower", error: error.message });
  }
}

export async function verifyCenterByBranch(req, res) {
  try {
    const branch = await CourierBranch.findById(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Center branch not found" });
    }

    const company = await CourierCompany.findById(branch.courierCompanyId);
    if (!company) {
      return res.status(404).json({ message: "Courier company not found" });
    }

    company.status = "approved";
    company.businessLicenseVerified = true;
    company.approval.approvedByUserId = req.user.id;
    company.approval.approvedAt = new Date();
    company.approval.remarks = req.body.remarks || company.approval.remarks || "";

    branch.status = "approved";
    branch.approvedByUserId = req.user.id;
    branch.approvedAt = new Date();
    branch.disabledAt = null;

    await Promise.all([company.save(), branch.save()]);

    if (branch.managerStaffId) {
      await CourierStaff.updateOne({ _id: branch.managerStaffId }, { $set: { status: "active" } });
    }

    await createAuditLog({
      category: "dms_ops",
      action: "center.verified",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: company._id,
        branchId: branch._id,
        targetType: "courier_branch",
        targetId: `${branch._id}`,
      },
      metadata: {
        companyStatus: company.status,
        branchStatus: branch.status,
        remarks: req.body.remarks || "",
      },
      req,
    });

    return res.json({
      message: "Center verified successfully",
      center: {
        companyId: company._id,
        companyStatus: company.status,
        branchId: branch._id,
        branchStatus: branch.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify center", error: error.message });
  }
}

export async function suspendCenterByBranch(req, res) {
  try {
    const branch = await CourierBranch.findById(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Center branch not found" });
    }

    const company = await CourierCompany.findById(branch.courierCompanyId);
    if (!company) {
      return res.status(404).json({ message: "Courier company not found" });
    }

    branch.status = "disabled";
    branch.disabledAt = new Date();
    await branch.save();

    const remainingApprovedBranches = await CourierBranch.countDocuments({
      courierCompanyId: company._id,
      _id: { $ne: branch._id },
      status: "approved",
    });

    if (remainingApprovedBranches === 0) {
      company.status = "suspended";
      company.approval.suspendedByUserId = req.user.id;
      company.approval.suspendedAt = new Date();
      company.approval.remarks = req.body.remarks || company.approval.remarks || "";
      await company.save();
    }

    await createAuditLog({
      category: "dms_security",
      action: "center.suspended",
      severity: "warn",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: company._id,
        branchId: branch._id,
        targetType: "courier_branch",
        targetId: `${branch._id}`,
      },
      metadata: {
        companyStatus: company.status,
        branchStatus: branch.status,
        remarks: req.body.remarks || "",
      },
      req,
    });

    return res.json({
      message: "Center suspended successfully",
      center: {
        companyId: company._id,
        companyStatus: company.status,
        branchId: branch._id,
        branchStatus: branch.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to suspend center", error: error.message });
  }
}

export async function getAdminDashboard(req, res) {
  try {
    const data = await getSuperAdminDashboard();
    return res.json({ dashboard: data });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch super admin dashboard", error: error.message });
  }
}

export async function getCourierDashboardSummary(req, res) {
  try {
    const courierCompanyId = req.params.courierCompanyId || req.dmsActor.courierCompanyId;
    if (!courierCompanyId) return res.status(400).json({ message: "courierCompanyId is required" });

    if (req.dmsActor.scope === "company" && courierCompanyId !== req.dmsActor.courierCompanyId) {
      return res.status(403).json({ message: "Cannot access another company dashboard" });
    }

    const company = await CourierCompany.findById(courierCompanyId).lean();
    if (!company) return res.status(404).json({ message: "Courier company not found" });

    const data = await getCourierDashboard(courierCompanyId);
    return res.json({ courierCompany: company, dashboard: data });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch courier dashboard", error: error.message });
  }
}

export async function getBranchDashboardSummary(req, res) {
  try {
    const branchId = req.params.branchId || req.dmsActor.branchId;
    if (!branchId) return res.status(400).json({ message: "branchId is required" });
    if (req.dmsActor.scope === "branch" && req.dmsActor.branchId !== branchId) {
      return res.status(403).json({ message: "Cannot access another branch dashboard" });
    }
    if (req.dmsActor.scope === "rider" && req.dmsActor.branchId !== branchId) {
      return res.status(403).json({ message: "Riders can only access their assigned branch dashboard" });
    }

    const data = await getBranchDashboard(branchId);
    return res.json({ dashboard: data });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch branch dashboard", error: error.message });
  }
}

