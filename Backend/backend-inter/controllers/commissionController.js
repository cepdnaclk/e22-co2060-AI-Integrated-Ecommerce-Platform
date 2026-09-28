import CommissionPolicy from "../models/commissionPolicy.js";

export async function getCommissionPolicy(req, res) {
  try {
    const policy = await CommissionPolicy.findOne({
      isActive: true
    }).sort({ effectiveFrom: -1 });

    return res.status(200).json({
      success: true,
      policy
    });
  } catch (error) {
    console.error("Get commission policy error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch commission policy"
    });
  }
}

export async function updateCommissionPolicy(req, res) {
  try {
    const rate = Number(req.body.rate);

    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: "Commission rate must be between 0 and 100"
      });
    }

    const now = new Date();

    await CommissionPolicy.updateMany(
      { isActive: true },
      {
        $set: {
          isActive: false,
          effectiveTo: now
        }
      }
    );

    const policy = await CommissionPolicy.create({
      name: req.body.name?.trim() || "Default Marketplace Commission",
      rate,
      isActive: true,
      effectiveFrom: now,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: "Commission policy updated successfully",
      policy
    });
  } catch (error) {
    console.error("Update commission policy error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update commission policy"
    });
  }
}
