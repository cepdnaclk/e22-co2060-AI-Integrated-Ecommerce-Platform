import Seller from "../models/seller.js";

/**
 * ======================================================
 * 1️⃣ REGISTER SELLER (CREATE SELLER PROFILE)
 * POST /api/sellers/register
 * ======================================================
 * - Any authenticated user can register as seller
 * - One seller profile per user
 */
export async function registerSeller(req, res) {
  try {
    const userId = req.user.id;

    // 🔍 Check if seller profile already exists
    const existingSeller = await Seller.findOne({ userId });
    if (existingSeller) {
      return res.status(400).json({
        message: "Seller profile already exists"
      });
    }

    const { shopName, description, address, phone } = req.body;

    if (!shopName) {
      return res.status(400).json({
        message: "Shop name is required"
      });
    }

    // 🏪 Create seller profile
    const seller = await Seller.create({
      userId,
      shopName,
      description,
      address,
      phone
    });

    res.status(201).json({
      message: "Seller profile created successfully",
      seller
    });
  } catch (error) {
    console.error("❌ Register seller error:", error);
    res.status(500).json({
      message: "Failed to create seller profile",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * 2️⃣ GET LOGGED-IN SELLER PROFILE
 * GET /api/sellers/me
 * ======================================================
 * - Only works if user has a seller profile
 */
export async function getMySellerProfile(req, res) {
  try {
    const userId = req.user.id;

    const seller = await Seller.findOne({ userId });

    if (!seller) {
      return res.status(403).json({
        message: "You are not registered as a seller"
      });
    }

    res.json(seller);
  } catch (error) {
    console.error("❌ Get seller profile error:", error);
    res.status(500).json({
      message: "Failed to fetch seller profile",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * 3️⃣ UPDATE SELLER PROFILE
 * PUT /api/sellers/me
 * ======================================================
 * - Only works if user has a seller profile
 */
export async function updateSellerProfile(req, res) {
  try {
    const userId = req.user.id;

    const seller = await Seller.findOne({ userId });

    if (!seller) {
      return res.status(403).json({
        message: "You are not registered as a seller"
      });
    }

    // ✏️ Update allowed fields
    if (req.body.shopName !== undefined) seller.shopName = req.body.shopName;
    if (req.body.description !== undefined) seller.description = req.body.description;
    if (req.body.address !== undefined) seller.address = req.body.address;
    if (req.body.phone !== undefined) seller.phone = req.body.phone;

    await seller.save();

    res.json({
      message: "Seller profile updated successfully",
      seller
    });
  } catch (error) {
    console.error("❌ Update seller profile error:", error);
    res.status(500).json({
      message: "Failed to update seller profile",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * 4️⃣ GET PUBLIC SELLER PROFILE
 * GET /api/sellers/:id
 * ======================================================
 * - Buyer-facing seller profile
 */
export async function getSellerById(req, res) {
  try {
    const seller = await Seller.findById(req.params.id);

    if (!seller || !seller.isActive) {
      return res.status(404).json({
        message: "Seller not found"
      });
    }

    res.json(seller);
  } catch (error) {
    console.error("❌ Get seller by id error:", error);
    res.status(500).json({
      message: "Failed to fetch seller",
      error: error.message
    });
  }
}