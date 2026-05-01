import CourierCompany from "../models/courierCompany.js";
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

export async function registerCourierCompany(req, res) {
  try {
    const missing = requireFields(req.body, ["companyName", "registrationNumber"]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
    }

    const exists = await CourierCompany.findOne({ registrationNumber: req.body.registrationNumber }).lean();
    if (exists) {
      return res.status(409).json({ message: "Courier company already exists with this registration number" });
    }

    const courier = await CourierCompany.create({
      companyName: req.body.companyName,
      registrationNumber: req.body.registrationNumber,
      businessLicenseNumber: req.body.businessLicenseNumber || "",
      businessLicenseVerified: false,
      address: req.body.address || "",
      province: req.body.province || "",
      district: req.body.district || "",
      city: req.body.city || "",
      postalCode: req.body.postalCode || "",
      phone: req.body.phone || "",
      email: req.body.email || "",
      serviceRegions: req.body.serviceRegions || [],
      status: "pending",
      createdByUserId: req.user.id,
    });

    await createAuditLog({
      category: "dms_ops",
      action: "courier.registered",
      actor: actorForAudit(req),
      context: { courierCompanyId: courier._id, targetType: "courier_company", targetId: `${courier._id}` },
      metadata: { registrationNumber: courier.registrationNumber },
      req,
    });

    return res.status(201).json({ message: "Courier registration submitted for approval", courier });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register courier company", error: error.message });
  }
}

export async function getAdminCouriers(req, res) {
  try {
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }
    const couriers = await CourierCompany.find(filters).sort({ createdAt: -1 }).lean();
    return res.json({ count: couriers.length, couriers });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch courier companies", error: error.message });
  }
}

export async function approveCourierCompany(req, res) {
  try {
    const courier = await CourierCompany.findById(req.params.courierId);
    if (!courier) {
      return res.status(404).json({ message: "Courier company not found" });
    }

    courier.status = "approved";
    courier.businessLicenseVerified = true;
    courier.approval.approvedByUserId = req.user.id;
    courier.approval.approvedAt = new Date();
    courier.approval.remarks = req.body.remarks || "";
    await courier.save();

    await createAuditLog({
      category: "dms_ops",
      action: "courier.approved",
      actor: actorForAudit(req),
      context: { courierCompanyId: courier._id, targetType: "courier_company", targetId: `${courier._id}` },
      metadata: { remarks: req.body.remarks || "" },
      req,
    });

    return res.json({ message: "Courier company approved", courier });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve courier company", error: error.message });
  }
}

export async function suspendCourierCompany(req, res) {
  try {
    const courier = await CourierCompany.findById(req.params.courierId);
    if (!courier) {
      return res.status(404).json({ message: "Courier company not found" });
    }

    courier.status = "suspended";
    courier.approval.suspendedByUserId = req.user.id;
    courier.approval.suspendedAt = new Date();
    courier.approval.remarks = req.body.remarks || "";
    await courier.save();

    await createAuditLog({
      category: "dms_security",
      action: "courier.suspended",
      severity: "warn",
      actor: actorForAudit(req),
      context: { courierCompanyId: courier._id, targetType: "courier_company", targetId: `${courier._id}` },
      metadata: { remarks: req.body.remarks || "" },
      req,
    });

    return res.json({ message: "Courier company suspended", courier });
  } catch (error) {
    return res.status(500).json({ message: "Failed to suspend courier company", error: error.message });
  }
}

