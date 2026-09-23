import DeliveryOrder from "../models/deliveryOrder.js";
import DeliveryDispute from "../models/deliveryDispute.js";
import DeliverySettlement from "../models/deliverySettlement.js";
import CourierCompany from "../models/courierCompany.js";
import CourierBranch from "../models/courierBranch.js";
import CourierStaff from "../models/courierStaff.js";

function toPercent(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export async function getSuperAdminDashboard() {
  const [activeShipments, delayedShipments, failedShipments, returnedShipments, disputes, couriers, branches, riders, flaggedSettlements] = await Promise.all([
    DeliveryOrder.countDocuments({ status: { $in: ["shipment_registered", "received_at_branch", "in_sorting", "out_for_delivery"] } }),
    DeliveryOrder.countDocuments({ expectedDeliveryAt: { $lt: new Date() }, status: { $nin: ["delivered", "returned"] } }),
    DeliveryOrder.countDocuments({ status: "failed_delivery" }),
    DeliveryOrder.countDocuments({ status: "returned" }),
    DeliveryDispute.countDocuments({ status: { $in: ["open", "investigating", "escalated"] } }),
    CourierCompany.countDocuments({}),
    CourierBranch.countDocuments({}),
    CourierStaff.countDocuments({ role: "delivery_rider", status: "active" }),
    DeliverySettlement.countDocuments({ state: "flagged" }),
  ]);

  return {
    activeShipments,
    delayedShipments,
    failedShipments,
    returnedShipments,
    openDisputes: disputes,
    courierCompanies: couriers,
    branches,
    activeRiders: riders,
    flaggedSettlements,
  };
}

export async function getCourierDashboard(courierCompanyId) {
  const [total, delivered, failed, delayed, openDisputes, branchCount, riderCount] = await Promise.all([
    DeliveryOrder.countDocuments({ courierCompanyId }),
    DeliveryOrder.countDocuments({ courierCompanyId, status: "delivered" }),
    DeliveryOrder.countDocuments({ courierCompanyId, status: "failed_delivery" }),
    DeliveryOrder.countDocuments({ courierCompanyId, expectedDeliveryAt: { $lt: new Date() }, status: { $nin: ["delivered", "returned"] } }),
    DeliveryDispute.countDocuments({ courierCompanyId, status: { $in: ["open", "investigating", "escalated"] } }),
    CourierBranch.countDocuments({ courierCompanyId }),
    CourierStaff.countDocuments({ courierCompanyId, role: "delivery_rider", status: "active" }),
  ]);

  return {
    shipments: {
      total,
      delivered,
      failed,
      delayed,
      successRate: toPercent(delivered, total),
      failureRate: toPercent(failed, total),
    },
    openDisputes,
    branchCount,
    activeRiders: riderCount,
  };
}

export async function getBranchDashboard(branchId) {
  const [total, delivered, failed, delayed, inventory] = await Promise.all([
    DeliveryOrder.countDocuments({ assignedBranchId: branchId }),
    DeliveryOrder.countDocuments({ assignedBranchId: branchId, status: "delivered" }),
    DeliveryOrder.countDocuments({ assignedBranchId: branchId, status: "failed_delivery" }),
    DeliveryOrder.countDocuments({ assignedBranchId: branchId, expectedDeliveryAt: { $lt: new Date() }, status: { $nin: ["delivered", "returned"] } }),
    DeliveryOrder.countDocuments({ currentBranchId: branchId, status: { $in: ["received_at_branch", "in_sorting"] } }),
  ]);

  return {
    shipmentsHandled: total,
    delivered,
    failed,
    delayed,
    onTimePerformance: toPercent(delivered - delayed, delivered || 1),
    branchInventory: inventory,
  };
}

