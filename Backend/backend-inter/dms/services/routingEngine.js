import DeliveryRule from "../models/deliveryRule.js";
import CourierBranch from "../models/courierBranch.js";
import DeliveryOrder from "../models/deliveryOrder.js";
import ServiceZone from "../models/serviceZone.js";

function startsWithPostal(postalCode = "", prefix = "") {
  if (!postalCode || !prefix) return false;
  return `${postalCode}`.toLowerCase().startsWith(`${prefix}`.toLowerCase());
}

function matchesRuleConditions(destination, codAmount, conditions = {}) {
  if (conditions.province && conditions.province !== destination.province) return false;
  if (conditions.district && conditions.district !== destination.district) return false;
  if (conditions.city && conditions.city !== destination.city) return false;
  if (conditions.postalCodePrefix && !startsWithPostal(destination.postalCode, conditions.postalCodePrefix)) return false;
  if (conditions.minCodAmount !== null && conditions.minCodAmount !== undefined && codAmount < conditions.minCodAmount) return false;
  return true;
}

async function calculateBranchLoadPercent(branchId) {
  const activeCount = await DeliveryOrder.countDocuments({
    assignedBranchId: branchId,
    status: { $in: ["shipment_registered", "received_at_branch", "in_sorting", "out_for_delivery"] },
  });
  const branch = await CourierBranch.findById(branchId).select("capacity").lean();
  const capacity = Number(branch?.capacity?.dailyShipmentCapacity || 0);
  if (!capacity) return 0;
  return (activeCount / capacity) * 100;
}

function matchesBranchCoverage(branch, destination) {
  const coverage = branch.coverageArea || {};

  if (coverage.postalCodes?.length > 0 && coverage.postalCodes.includes(destination.postalCode)) {
    return true;
  }

  if (coverage.districts?.length > 0 && coverage.districts.includes(destination.district)) {
    return true;
  }

  if (coverage.provinces?.length > 0 && coverage.provinces.includes(destination.province)) {
    return true;
  }

  return (
    branch.district === destination.district ||
    branch.province === destination.province
  );
}

export async function findServiceZone({ courierCompanyId, destination }) {
  const zones = await ServiceZone.find({
    $or: [{ courierCompanyId }, { courierCompanyId: null }],
    isActive: true,
  })
    .sort({ priority: 1 })
    .lean();

  return zones.find((zone) => {
    if (zone.district && zone.district !== destination.district) return false;
    if (zone.province && zone.province !== destination.province) return false;
    if (zone.postalCodes?.length && !zone.postalCodes.includes(destination.postalCode)) return false;
    return true;
  }) || null;
}

export async function assignBranchByRules({
  courierCompanyId,
  destination,
  codAmount = 0,
}) {
  const routingRules = await DeliveryRule.find({
    scope: "routing",
    isActive: true,
    $or: [{ courierCompanyId }, { courierCompanyId: null }],
  })
    .sort({ priority: 1, createdAt: 1 })
    .lean();

  for (const rule of routingRules) {
    if (!matchesRuleConditions(destination, codAmount, rule.conditions)) {
      continue;
    }

    const branchId = rule.actions?.assignBranchId;
    if (!branchId) {
      continue;
    }

    const branch = await CourierBranch.findOne({
      _id: branchId,
      courierCompanyId,
      status: "approved",
    }).lean();

    if (!branch) {
      continue;
    }

    const loadPercent = await calculateBranchLoadPercent(branch._id);
    const overloadThreshold = rule.conditions?.branchOverloadPercent;
    if (overloadThreshold !== null && overloadThreshold !== undefined && loadPercent > overloadThreshold) {
      if (rule.actions?.alternateBranchId) {
        const alternate = await CourierBranch.findOne({
          _id: rule.actions.alternateBranchId,
          courierCompanyId,
          status: "approved",
        }).lean();
        if (alternate) {
          return {
            branch: alternate,
            assignedByRuleId: rule._id,
            assignmentReason: "alternate_branch_due_to_overload",
            requireExtraVerification: Boolean(rule.actions?.requireExtraVerification),
          };
        }
      }
      continue;
    }

    return {
      branch,
      assignedByRuleId: rule._id,
      assignmentReason: "matched_routing_rule",
      requireExtraVerification: Boolean(rule.actions?.requireExtraVerification),
    };
  }

  const candidates = await CourierBranch.find({
    courierCompanyId,
    status: "approved",
  }).lean();

  const matched = candidates.filter((branch) => matchesBranchCoverage(branch, destination));
  const fallback = matched[0] || candidates[0] || null;

  return {
    branch: fallback,
    assignedByRuleId: null,
    assignmentReason: fallback ? "coverage_based_assignment" : "no_branch_available",
    requireExtraVerification: false,
  };
}

