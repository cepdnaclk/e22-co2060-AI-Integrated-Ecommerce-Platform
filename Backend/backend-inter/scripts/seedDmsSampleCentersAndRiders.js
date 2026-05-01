import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import userModel from "../models/user.js";
import CourierCompany from "../dms/models/courierCompany.js";
import CourierBranch from "../dms/models/courierBranch.js";
import CourierStaff from "../dms/models/courierStaff.js";

dotenv.config();

const mongoURI =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/?appName=Cluster0";

const outputFilePath = path.resolve(process.cwd(), "dms-sample-login-credentials.txt");

const sriLankaCenters = [
  { city: "Colombo", district: "Colombo", province: "Western Province", postalCode: "00100" },
  { city: "Kandy", district: "Kandy", province: "Central Province", postalCode: "20000" },
  { city: "Galle", district: "Galle", province: "Southern Province", postalCode: "80000" },
  { city: "Jaffna", district: "Jaffna", province: "Northern Province", postalCode: "40000" },
  { city: "Negombo", district: "Gampaha", province: "Western Province", postalCode: "11500" },
  { city: "Kurunegala", district: "Kurunegala", province: "North Western Province", postalCode: "60000" },
  { city: "Anuradhapura", district: "Anuradhapura", province: "North Central Province", postalCode: "50000" },
  { city: "Batticaloa", district: "Batticaloa", province: "Eastern Province", postalCode: "30000" },
  { city: "Matara", district: "Matara", province: "Southern Province", postalCode: "81000" },
  { city: "Ratnapura", district: "Ratnapura", province: "Sabaragamuwa Province", postalCode: "70000" },
];

function pad2(value) {
  return `${value}`.padStart(2, "0");
}

function normalizeEmail(value = "") {
  return `${value}`.toLowerCase().trim();
}

async function upsertUser({
  email,
  password,
  firstName,
  lastName,
  phone,
  address,
  city,
  province,
  postalCode,
}) {
  const normalizedEmail = normalizeEmail(email);
  const hashedPassword = await bcrypt.hash(password, 10);
  return userModel.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      firstName,
      lastName,
      password: hashedPassword,
      role: "customer",
      isBlocked: false,
      isEmailVerified: true,
      phone: phone || "",
      address: address || "",
      addressLocation: {
        lat: null,
        lng: null,
        placeId: "",
        provider: "seed-script",
        accuracy: null,
        timestamp: "",
        country: "Sri Lanka",
        state: province || "",
        city: city || "",
        postalCode: postalCode || "",
        street: address || "",
        formattedAddress: [address, city, province].filter(Boolean).join(", "),
        verified: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seedCenter(centerIndex, location) {
  const centerNo = centerIndex + 1;
  const centerCode = `SLCEN-${pad2(centerNo)}`;
  const companyName = `Sample Lanka Delivery Center ${pad2(centerNo)} - ${location.city}`;
  const registrationNumber = `SL-DMS-TEST-${pad2(centerNo)}`;
  const managerEmail = `center${pad2(centerNo)}.manager@dms-sample.lk`;
  const managerPassword = `Center${pad2(centerNo)}@123`;
  const managerName = `Center${pad2(centerNo)} Manager`;
  const managerEmployeeId = `MGR-${pad2(centerNo)}`;
  const basePhone = `+9477000${pad2(centerNo)}00`;
  const address = `No ${centerNo}, Main Delivery Hub Road, ${location.city}`;

  const managerUser = await upsertUser({
    email: managerEmail,
    password: managerPassword,
    firstName: `Center${pad2(centerNo)}`,
    lastName: "Manager",
    phone: basePhone,
    address,
    city: location.city,
    province: location.province,
    postalCode: location.postalCode,
  });

  const company = await CourierCompany.findOneAndUpdate(
    { registrationNumber },
    {
      companyName,
      registrationNumber,
      businessLicenseNumber: `BL-SL-${pad2(centerNo)}0001`,
      businessLicenseVerified: true,
      address,
      province: location.province,
      district: location.district,
      city: location.city,
      postalCode: location.postalCode,
      email: managerEmail,
      phone: basePhone,
      serviceRegions: [
        {
          province: location.province,
          district: location.district,
          city: location.city,
          postalPrefixes: [location.postalCode.slice(0, 2)],
        },
      ],
      status: "approved",
      createdByUserId: managerUser._id,
      approval: {
        approvedByUserId: managerUser._id,
        approvedAt: new Date(),
        suspendedByUserId: null,
        suspendedAt: null,
        remarks: "Seeded sample data for test cases",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const branch = await CourierBranch.findOneAndUpdate(
    { courierCompanyId: company._id, branchCode: centerCode },
    {
      courierCompanyId: company._id,
      branchCode: centerCode,
      branchName: `${location.city} Central Branch`,
      province: location.province,
      district: location.district,
      city: location.city,
      address: `${address}, ${location.postalCode}`,
      postalCode: location.postalCode,
      phone: basePhone,
      email: managerEmail,
      coverageArea: {
        provinces: [location.province],
        districts: [location.district],
        postalCodes: [location.postalCode],
        zoneIds: [],
      },
      operatingHours: [
        { day: "Mon-Fri", open: "08:00", close: "20:00", isClosed: false },
        { day: "Sat", open: "08:00", close: "18:00", isClosed: false },
        { day: "Sun", open: "09:00", close: "16:00", isClosed: false },
      ],
      capacity: {
        dailyShipmentCapacity: 800,
        maxConcurrentRiders: 120,
        overloadThresholdPercent: 90,
      },
      status: "approved",
      approvedByUserId: managerUser._id,
      approvedAt: new Date(),
      createdByUserId: managerUser._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const managerStaff = await CourierStaff.findOneAndUpdate(
    { courierCompanyId: company._id, employeeId: managerEmployeeId },
    {
      courierCompanyId: company._id,
      assignedBranchId: branch._id,
      authUserId: managerUser._id,
      employeeId: managerEmployeeId,
      role: "branch_manager",
      fullName: managerName,
      phone: basePhone,
      email: managerEmail,
      idVerification: {
        idType: "NIC",
        idNumber: `NIC-CM-${pad2(centerNo)}`,
        verified: true,
        verifiedAt: new Date(),
        verifiedByUserId: managerUser._id,
      },
      status: "active",
      createdByUserId: managerUser._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await CourierBranch.updateOne({ _id: branch._id }, { $set: { managerStaffId: managerStaff._id } });

  const riders = [];
  for (let riderIndex = 1; riderIndex <= 10; riderIndex += 1) {
    const riderNo = pad2(riderIndex);
    const riderEmail = `center${pad2(centerNo)}.rider${riderNo}@dms-sample.lk`;
    const riderPassword = `Rider${pad2(centerNo)}${riderNo}@123`;
    const riderName = `Center${pad2(centerNo)} Rider ${riderNo}`;
    const riderEmployeeId = `RID-${pad2(centerNo)}-${riderNo}`;
    const riderPhone = `+94772${pad2(centerNo)}${riderNo}00`;

    const riderUser = await upsertUser({
      email: riderEmail,
      password: riderPassword,
      firstName: `Rider${riderNo}`,
      lastName: `C${pad2(centerNo)}`,
      phone: riderPhone,
      address: `Rider Quarters, ${location.city}`,
      city: location.city,
      province: location.province,
      postalCode: location.postalCode,
    });

    await CourierStaff.findOneAndUpdate(
      { courierCompanyId: company._id, employeeId: riderEmployeeId },
      {
        courierCompanyId: company._id,
        assignedBranchId: branch._id,
        authUserId: riderUser._id,
        employeeId: riderEmployeeId,
        role: "delivery_rider",
        fullName: riderName,
        phone: riderPhone,
        email: riderEmail,
        idVerification: {
          idType: "NIC",
          idNumber: `NIC-R-${pad2(centerNo)}-${riderNo}`,
          verified: true,
          verifiedAt: new Date(),
          verifiedByUserId: managerUser._id,
        },
        status: "active",
        createdByUserId: managerUser._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    riders.push({
      role: "delivery_rider",
      centerCode,
      centerCity: location.city,
      centerName: companyName,
      staffName: riderName,
      email: riderEmail,
      password: riderPassword,
    });
  }

  const managerCredential = {
    role: "branch_manager",
    centerCode,
    centerCity: location.city,
    centerName: companyName,
    staffName: managerName,
    email: managerEmail,
    password: managerPassword,
  };

  return { managerCredential, riders };
}

function buildCredentialsFile(credentials) {
  const header = [
    "DMS SAMPLE LOGIN CREDENTIALS",
    `Generated: ${new Date().toISOString()}`,
    "Login URL: /dms/login",
    "",
    "Format: role | centerCode | city | centerName | staffName | email | password",
    "",
  ];

  const lines = credentials.map((item) =>
    [
      item.role,
      item.centerCode,
      item.centerCity,
      item.centerName,
      item.staffName,
      item.email,
      item.password,
    ].join(" | ")
  );

  return [...header, ...lines, ""].join("\n");
}

async function run() {
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    const allCredentials = [];
    for (let i = 0; i < sriLankaCenters.length; i += 1) {
      const seeded = await seedCenter(i, sriLankaCenters[i]);
      allCredentials.push(seeded.managerCredential, ...seeded.riders);
      console.log(`✅ Seeded center ${i + 1}/10 with 10 riders (${sriLankaCenters[i].city})`);
    }

    const content = buildCredentialsFile(allCredentials);
    await fs.writeFile(outputFilePath, content, "utf8");

    console.log("===============================================");
    console.log("🎉 Seeding complete");
    console.log("Centers seeded: 10");
    console.log("Riders seeded: 100");
    console.log(`Credential file: ${outputFilePath}`);
    console.log("===============================================");
  } catch (error) {
    console.error("❌ Failed to seed DMS sample data:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

run();
