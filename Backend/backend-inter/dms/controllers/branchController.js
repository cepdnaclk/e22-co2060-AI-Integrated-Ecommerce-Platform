import CourierBranch from "../models/courierBranch.js";
import CourierCompany from "../models/courierCompany.js";
import { withTenantScope } from "../middleware/dmsAccess.js";
import { createAuditLog } from "../services/auditService.js";
import { requireFields } from "../utils/validation.js";

function actorForAudit(req) {
  return {
    actorType: req.dmsActor?.actorType || "system",
    userId: req.dmsActor?.userId || null,
    staffId: req.dmsActor?.staffId || null,
    role: req.dmsActor?.actorRole || "",
  };
}

export async function createBranch(req, res) {
  try {
    const missing = requireFields(req.body, ["branchCode", "branchName", "district", "courierCompanyId"]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    if (req.dmsActor.scope === "company" && req.dmsActor.courierCompanyId !== req.body.courierCompanyId) {
      return res.status(403).json({ message: "Cannot create branch for another courier company" });
    }

    const company = await CourierCompany.findById(req.body.courierCompanyId).lean();
    if (!company) {
      return res.status(404).json({ message: "Courier company not found" });
    }
    if (company.status !== "approved") {
      return res.status(400).json({ message: "Courier company must be approved before adding branches" });
    }

    const existing = await CourierBranch.findOne({
      courierCompanyId: req.body.courierCompanyId,
      branchCode: req.body.branchCode,
    }).lean();
    if (existing) {
      return res.status(409).json({ message: "Branch code already exists for this courier company" });
    }

    const branch = await CourierBranch.create({
      courierCompanyId: req.body.courierCompanyId,
      branchCode: req.body.branchCode,
      branchName: req.body.branchName,
      province: req.body.province || "",
      district: req.body.district || "",
      city: req.body.city || "",
      address: req.body.address || "",
      postalCode: req.body.postalCode || "",
      phone: req.body.phone || "",
      email: req.body.email || "",
      coverageArea: req.body.coverageArea || {},
      operatingHours: req.body.operatingHours || [],
      capacity: req.body.capacity || {},
      status: req.dmsActor.scope === "platform" ? "approved" : "pending",
      approvedByUserId: req.dmsActor.scope === "platform" ? req.user.id : null,
      approvedAt: req.dmsActor.scope === "platform" ? new Date() : null,
      createdByUserId: req.user.id,
    });

    await createAuditLog({
      category: "dms_ops",
      action: "branch.created",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: branch.courierCompanyId,
        branchId: branch._id,
        targetType: "courier_branch",
        targetId: `${branch._id}`,
      },
      metadata: { branchCode: branch.branchCode, status: branch.status },
      req,
    });

    return res.status(201).json({ message: "Branch created", branch });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create branch", error: error.message });
  }
}

export async function listBranches(req, res) {
  try {
    const baseFilter = {};
    if (req.query.courierCompanyId) {
      baseFilter.courierCompanyId = req.query.courierCompanyId;
    }
    if (req.query.status) {
      baseFilter.status = req.query.status;
    }
    const scopeFilter = withTenantScope(req, baseFilter, {
      branchFields: ["_id"],
    });
    const branches = await CourierBranch.find(scopeFilter).sort({ createdAt: -1 }).lean();
    return res.json({ count: branches.length, branches });
  } catch (error) {
    return res.status(500).json({ message: "Failed to list branches", error: error.message });
  }
}

export async function approveBranch(req, res) {
  try {
    const branch = await CourierBranch.findById(req.params.branchId);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    if (req.dmsActor.scope === "company" && `${branch.courierCompanyId}` !== req.dmsActor.courierCompanyId) {
      return res.status(403).json({ message: "Cannot approve branch outside your company" });
    }

    branch.status = "approved";
    branch.approvedByUserId = req.user.id;
    branch.approvedAt = new Date();
    await branch.save();

    await createAuditLog({
      category: "dms_ops",
      action: "branch.approved",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: branch.courierCompanyId,
        branchId: branch._id,
        targetType: "courier_branch",
        targetId: `${branch._id}`,
      },
      req,
    });

    return res.json({ message: "Branch approved", branch });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve branch", error: error.message });
  }
}

export async function disableBranch(req, res) {
  try {
    const branch = await CourierBranch.findById(req.params.branchId);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    if (req.dmsActor.scope === "company" && `${branch.courierCompanyId}` !== req.dmsActor.courierCompanyId) {
      return res.status(403).json({ message: "Cannot disable branch outside your company" });
    }

    branch.status = "disabled";
    branch.disabledAt = new Date();
    await branch.save();

    await createAuditLog({
      category: "dms_security",
      action: "branch.disabled",
      severity: "warn",
      actor: actorForAudit(req),
      context: {
        courierCompanyId: branch.courierCompanyId,
        branchId: branch._id,
        targetType: "courier_branch",
        targetId: `${branch._id}`,
      },
      metadata: { reason: req.body.reason || "" },
      req,
    });

    return res.json({ message: "Branch disabled", branch });
  } catch (error) {
    return res.status(500).json({ message: "Failed to disable branch", error: error.message });
  }
}

