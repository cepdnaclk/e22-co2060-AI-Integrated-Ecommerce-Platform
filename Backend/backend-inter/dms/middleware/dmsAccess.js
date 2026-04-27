import mongoose from "mongoose";
import CourierStaff from "../models/courierStaff.js";
import Seller from "../../models/seller.js";

function normalizeStaffRole(role = "") {
  return `${role}`.toLowerCase();
}

function isPlatformAdmin(userRole = "") {
  return userRole === "admin" || userRole === "ceo";
}

export async function resolveDmsActor(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const actor = {
      actorType: "customer",
      actorRole: req.user.role || "customer",
      userId: req.user.id,
      staffId: null,
      courierCompanyId: null,
      branchId: null,
      sellerId: null,
      scope: "none",
      permissions: [],
    };

    if (isPlatformAdmin(req.user.role)) {
      actor.actorType = "platform_admin";
      actor.scope = "platform";
      actor.permissions = ["*"];
      req.dmsActor = actor;
      return next();
    }

    const staff = await CourierStaff.findOne({
      authUserId: new mongoose.Types.ObjectId(req.user.id),
      status: "active",
    }).lean();

    if (staff) {
      const staffRole = normalizeStaffRole(staff.role);
      actor.actorType = "dms_staff";
      actor.actorRole = staffRole;
      actor.staffId = `${staff._id}`;
      actor.courierCompanyId = `${staff.courierCompanyId}`;
      actor.branchId = staff.assignedBranchId ? `${staff.assignedBranchId}` : null;
      actor.scope = staffRole === "dms_admin"
        ? "platform"
        : staffRole === "company_admin"
          ? "company"
          : staffRole === "delivery_rider"
            ? "rider"
            : "branch";
      actor.permissions = [staffRole];
      req.dmsActor = actor;
      return next();
    }

    if (req.user.role === "seller") {
      const seller = await Seller.findOne({ userId: req.user.id }).lean();
      actor.actorType = "seller";
      actor.actorRole = "seller";
      actor.sellerId = seller ? `${seller._id}` : null;
      actor.scope = "seller";
      actor.permissions = ["seller"];
    }

    req.dmsActor = actor;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve DMS actor", error: error.message });
  }
}

export function requireDmsRoles(...allowedRoles) {
  return (req, res, next) => {
    const actorRole = req.dmsActor?.actorRole;
    const actorType = req.dmsActor?.actorType;

    if (!actorRole && actorType !== "platform_admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (actorType === "platform_admin") {
      return next();
    }

    if (!allowedRoles.includes(actorRole)) {
      return res.status(403).json({ message: "Access denied for role" });
    }

    return next();
  };
}

export function withTenantScope(req, baseFilter = {}, options = {}) {
  const actor = req.dmsActor || {};
  const {
    companyField = "courierCompanyId",
    branchFields = ["assignedBranchId", "currentBranchId", "branchId"],
    riderField = "currentRiderId",
    sellerField = "sellerId",
  } = options;

  if (actor.scope === "platform") {
    return { ...baseFilter };
  }

  if (actor.scope === "company") {
    return { ...baseFilter, [companyField]: actor.courierCompanyId };
  }

  if (actor.scope === "branch") {
    const branchClauses = branchFields.map((field) => ({ [field]: actor.branchId }));
    return {
      ...baseFilter,
      [companyField]: actor.courierCompanyId,
      $or: branchClauses,
    };
  }

  if (actor.scope === "rider") {
    return {
      ...baseFilter,
      [companyField]: actor.courierCompanyId,
      [riderField]: actor.staffId,
    };
  }

  if (actor.scope === "seller") {
    if (!actor.sellerId) {
      return { ...baseFilter, _id: null };
    }
    return { ...baseFilter, [sellerField]: actor.sellerId };
  }

  return { ...baseFilter, _id: null };
}

