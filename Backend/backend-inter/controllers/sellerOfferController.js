import sellerOfferModel from "../models/sellerOffer.js";
import Seller from "../models/seller.js";

/**
 * ======================================================
 * SELLER OFFER CONTROLLER
 * ======================================================
 * This file handles ALL seller-side product selling logic
 *
 * Architecture:
 * User (auth) → Seller (business) → SellerOffer → Product
 *
 * FEATURES IMPLEMENTED:
 * 1️⃣ Seller creates an offer for a product
 * 2️⃣ Seller views all their own offers (dashboard)
 * 3️⃣ Seller updates price / stock / warranty
 * 4️⃣ Seller disables (pauses) an offer
 * ======================================================
 */


/**
 * ======================================================
 * 1️⃣ CREATE SELLER OFFER
 * ======================================================
 * ROUTE:  POST /api/seller-offers
 * ACCESS: Seller only
 *
 * WHAT THIS DOES:
 * - Allows a seller to sell a product
 * - Links Product ↔ Seller via SellerOffer
 *
 * STEPS:
 * 1. Find seller profile using logged-in user
 * 2. Create SellerOffer using seller._id
 */
export async function addSellerOffer(req, res) {
  try {
    const { productId, variantId, price, stock, warranty, discountPercentage, deliveryOptions, image } = req.body;

    // 🔍 Find seller profile for logged-in user
    const seller = await Seller.findOne({ userId: req.user.id });

    if (!seller) {
      return res.status(404).json({
        message: "Seller profile not found. Please register as a seller first."
      });
    }

    // 🏷️ Create new seller offer
    const offer = await sellerOfferModel.create({
      productId,                            // Global product
      variantId: variantId || null,         // 🎨 Specific variant (optional)
      sellerId: seller._id,                  // Seller business ID
      sellerName: seller.shopName,           // Cached seller name
      price,
      stock,
      warranty,
      discountPercentage: discountPercentage || 0,
      deliveryOptions: deliveryOptions || ["Standard"],
      image: image || "",                    // 🖼️ Uploaded image URL
    });

    res.status(201).json({
      message: "Seller offer created successfully",
      offer
    });

  } catch (error) {
    console.error("❌ Add seller offer error:", error);
    res.status(500).json({
      message: "Failed to create seller offer",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * 2️⃣ GET MY SELLER OFFERS (SELLER DASHBOARD)
 * ======================================================
 * ROUTE:  GET /api/seller-offers/my
 * ACCESS: Seller only
 *
 * WHAT THIS DOES:
 * - Returns all offers created by the logged-in seller
 * - Used for seller dashboard
 */
export async function getMySellerOffers(req, res) {
  try {
    // 🔍 Find seller profile
    const seller = await Seller.findOne({ userId: req.user.id });

    if (!seller) {
      return res.status(404).json({
        message: "Seller profile not found"
      });
    }

    // 📦 Fetch all offers belonging to this seller
    const offers = await sellerOfferModel
      .find({ sellerId: seller._id })
      .populate("productId", "productName image category")
      .sort({ createdAt: -1 });

    res.json(offers);

  } catch (error) {
    console.error("❌ Get my seller offers error:", error);
    res.status(500).json({
      message: "Failed to fetch seller offers",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * 3️⃣ UPDATE SELLER OFFER
 * ======================================================
 * ROUTE:  PUT /api/seller-offers/:id
 * ACCESS: Seller only (owner)
 *
 * WHAT THIS DOES:
 * - Allows seller to update:
 *   ✔ price
 *   ✔ stock
 *   ✔ warranty
 *
 * SECURITY:
 * - Seller can update ONLY their own offers
 */
export async function updateSellerOffer(req, res) {
  try {
    // 🔍 Find seller profile
    const seller = await Seller.findOne({ userId: req.user.id });

    if (!seller) {
      return res.status(404).json({
        message: "Seller profile not found"
      });
    }

    // 🔐 Ensure offer belongs to this seller
    const offer = await sellerOfferModel.findOne({
      _id: req.params.id,
      sellerId: seller._id
    });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found or access denied"
      });
    }

    // ✏️ Update allowed fields only
    if (req.body.price    !== undefined) offer.price    = req.body.price;
    if (req.body.stock    !== undefined) offer.stock    = req.body.stock;
    if (req.body.warranty !== undefined) offer.warranty = req.body.warranty;
    if (req.body.isActive !== undefined) offer.isActive = req.body.isActive;

    await offer.save();

    res.json({
      message: "Seller offer updated successfully",
      offer
    });

  } catch (error) {
    console.error("❌ Update seller offer error:", error);
    res.status(500).json({
      message: "Failed to update seller offer",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * 4️⃣ DISABLE (PAUSE) SELLER OFFER
 * ======================================================
 * ROUTE:  DELETE /api/seller-offers/:id
 * ACCESS: Seller only (owner)
 *
 * WHAT THIS DOES:
 * - Soft deletes the offer
 * - Keeps history for orders & analytics
 * - Offer will NOT appear to buyers
 */
export async function disableSellerOffer(req, res) {
  try {
    // 🔍 Find seller profile
    const seller = await Seller.findOne({ userId: req.user.id });

    if (!seller) {
      return res.status(404).json({
        message: "Seller profile not found"
      });
    }

    // ⏸️ Disable offer (soft delete)
    const offer = await sellerOfferModel.findOneAndUpdate(
      {
        _id: req.params.id,
        sellerId: seller._id
      },
      { isActive: false },
      { new: true }
    );

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found or access denied"
      });
    }

    res.json({
      message: "Seller offer disabled successfully",
      offer
    });

  } catch (error) {
    console.error("❌ Disable seller offer error:", error);
    res.status(500).json({
      message: "Failed to disable seller offer",
      error: error.message
    });
  }
}

// BUYER SEARCH – NO AUTH
export async function searchSellerOffers(req, res) {
  try {
    const { q, category, sort = "price_asc", page = 1, limit = 8 } = req.query;

    const pipeline = [];

    // 🔗 Join Product
    pipeline.push({
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product"
      }
    });

    pipeline.push({ $unwind: "$product" });

    // 🔍 Search
    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { "product.productName": { $regex: q, $options: "i" } },
            { "product.description": { $regex: q, $options: "i" } }
          ]
        }
      });
    }

    // 📂 Category
    if (category && category !== "null") {
      pipeline.push({ $match: { "product.category": category } });
    }

    // ✅ Only active offers
    pipeline.push({ $match: { isActive: true } });

    // ↕ Sort
    if (sort === "price_desc") pipeline.push({ $sort: { price: -1 } });
    else pipeline.push({ $sort: { price: 1 } });

    // 📄 Pagination
    pipeline.push(
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    const results = await sellerOfferModel.aggregate(pipeline);

    res.json({
      results,
      totalResults: results.length
    });

  } catch (error) {
    res.status(500).json({
      results: [],
      totalResults: 0,
      message: "Seller offer search failed",
      error: error.message
    });
  }
}
