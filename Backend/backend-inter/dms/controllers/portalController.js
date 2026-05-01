import bcrypt from "bcryptjs";
import userModel from "../../models/user.js";
import CourierCompany from "../models/courierCompany.js";
import CourierBranch from "../models/courierBranch.js";
import CourierStaff from "../models/courierStaff.js";
import { createAuditLog } from "../services/auditService.js";
import { generateCode } from "../utils/idGenerator.js";
import { requireFields } from "../utils/validation.js";

function normalizeEmail(value = "") {
  return `${value}`.toLowerCase().trim();
}

export async function registerCenterPortalAccount(req, res) {
  const missing = requireFields(req.body, [
    "firstName",
    "lastName",
    "email",
    "password",
    "companyName",
    "registrationNumber",
    "branchCode",
    "branchName",
    "district",
  ]);
  if (missing.length) {
    return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
  }

  const email = normalizeEmail(req.body.email);
  if (!email.includes("@")) {
    return res.status(400).json({ message: "Valid email is required" });
  }
  if (`${req.body.password}`.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long" });
  }

  let createdUser = null;
  let createdCourier = null;
  let createdBranch = null;
  let createdStaff = null;

  try {
    const [existingUser, existingCourier] = await Promise.all([
      userModel.findOne({ email }).lean(),
      CourierCompany.findOne({ registrationNumber: req.body.registrationNumber }).lean(),
    ]);

    if (existingUser) {
      return res.status(409).json({ message: "An account already exists with this email" });
    }
    if (existingCourier) {
      return res.status(409).json({ message: "Courier company already exists with this registration number" });
    }

    const hashedPassword = await bcrypt.hash(`${req.body.password}`, 10);
    createdUser = await userModel.create({
      email,
      firstName: `${req.body.firstName}`.trim(),
      lastName: `${req.body.lastName}`.trim(),
      password: hashedPassword,
      role: "customer",
      isEmailVerified: true,
      phone: req.body.phone || "",
    });

    createdCourier = await CourierCompany.create({
      companyName: req.body.companyName,
      registrationNumber: req.body.registrationNumber,
      businessLicenseNumber: req.body.businessLicenseNumber || "",
      businessLicenseVerified: false,
      address: req.body.companyAddress || req.body.address || "",
      province: req.body.companyProvince || req.body.province || "",
      district: req.body.companyDistrict || req.body.district || "",
      city: req.body.companyCity || req.body.city || "",
      postalCode: req.body.companyPostalCode || req.body.postalCode || "",
      email: normalizeEmail(req.body.companyEmail || email),
      phone: req.body.companyPhone || req.body.phone || "",
      serviceRegions: req.body.serviceRegions || [],
      status: "pending",
      createdByUserId: createdUser._id,
    });

    createdBranch = await CourierBranch.create({
      courierCompanyId: createdCourier._id,
      branchCode: req.body.branchCode,
      branchName: req.body.branchName,
      province: req.body.branchProvince || req.body.province || "",
      district: req.body.branchDistrict || req.body.district || "",
      city: req.body.branchCity || req.body.city || "",
      address: req.body.branchAddress || req.body.address || "",
      postalCode: req.body.branchPostalCode || req.body.postalCode || "",
      phone: req.body.branchPhone || req.body.phone || "",
      email: normalizeEmail(req.body.branchEmail || email),
      coverageArea: req.body.coverageArea || {},
      operatingHours: req.body.operatingHours || [],
      status: "pending",
      createdByUserId: createdUser._id,
    });

    createdStaff = await CourierStaff.create({
      courierCompanyId: createdCourier._id,
      assignedBranchId: createdBranch._id,
      authUserId: createdUser._id,
      employeeId: req.body.employeeId || generateCode("EMP"),
      role: "branch_manager",
      fullName: `${req.body.firstName} ${req.body.lastName}`.trim(),
      phone: req.body.phone || req.body.branchPhone || req.body.companyPhone || "",
      email,
      idVerification: req.body.idVerification || {},
      status: "active",
      createdByUserId: createdUser._id,
    });

    createdBranch.managerStaffId = createdStaff._id;
    await createdBranch.save();

    await createAuditLog({
      category: "dms_ops",
      action: "portal.center_registered",
      actor: {
        actorType: "customer",
        userId: createdUser._id,
        staffId: createdStaff._id,
        role: "branch_manager",
      },
      context: {
        courierCompanyId: createdCourier._id,
        branchId: createdBranch._id,
        targetType: "dms_portal_onboarding",
        targetId: `${createdStaff._id}`,
      },
      metadata: {
        companyStatus: createdCourier.status,
        branchStatus: createdBranch.status,
        staffStatus: createdStaff.status,
      },
      req,
    });

    return res.status(201).json({
      message: "Registration successful. You can now log in to the delivery center dashboard.",
      registration: {
        email,
        courierCompanyId: createdCourier._id,
        branchId: createdBranch._id,
        staffId: createdStaff._id,
        companyStatus: createdCourier.status,
        branchStatus: createdBranch.status,
        staffStatus: createdStaff.status,
      },
    });
  } catch (error) {
    await Promise.allSettled([
      createdStaff ? CourierStaff.deleteOne({ _id: createdStaff._id }) : Promise.resolve(),
      createdBranch ? CourierBranch.deleteOne({ _id: createdBranch._id }) : Promise.resolve(),
      createdCourier ? CourierCompany.deleteOne({ _id: createdCourier._id }) : Promise.resolve(),
      createdUser ? userModel.deleteOne({ _id: createdUser._id }) : Promise.resolve(),
    ]);

    if (error?.code === 11000) {
      return res.status(409).json({ message: "Duplicate registration data. Check email, registration number, or branch code." });
    }

    return res.status(500).json({ message: "Failed to register delivery center account", error: error.message });
  }
}

