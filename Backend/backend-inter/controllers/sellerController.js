import Seller from "../models/seller.js";

/**
 * ======================================================
 * 1️⃣ REGISTER SELLER (CREATE SELLER PROFILE)
 * POST /api/sellers/register
 * ======================================================
 * - User must be authenticated
 * - User must have role = "seller"
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

    const {
      shopName,
      description,
      address,
      phone
    } = req.body;

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
 */
export async function getMySellerProfile(req, res) {
  try {
    const userId = req.user.id;

    const seller = await Seller.findOne({ userId });

    if (!seller) {
      return res.status(404).json({
        message: "Seller profile not found"
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
 */
export async function updateSellerProfile(req, res) {
  try {
    const userId = req.user.id;

    const updatedSeller = await Seller.findOneAndUpdate(
      { userId },
      req.body,
      { new: true }
    );

    if (!updatedSeller) {
      return res.status(404).json({
        message: "Seller profile not found"
      });
    }

    res.json({
      message: "Seller profile updated successfully",
      seller: updatedSeller
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
 * 4️⃣ GET PUBLIC SELLER PROFILE (OPTIONAL, FUTURE)
 * GET /api/sellers/:id
 * ======================================================
 * - Used for buyer-facing seller pages
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
