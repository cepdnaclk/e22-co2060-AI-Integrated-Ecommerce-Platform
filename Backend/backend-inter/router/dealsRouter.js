import express from "express";
import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";

const router = express.Router();

/**
 * GET /api/deals
 * Returns products that have at least one active SellerOffer
 * with discountPercentage > 0, enriched with the best (cheapest discounted) offer.
 *
 * Query params:
 *   limit    (default 20)
 *   page     (default 1)
 *   category (optional)
 *   sort     (discount_desc | price_asc | price_desc | newest) default discount_desc
 *   minDiscount (number, default 0)
 */
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      sort = "discount_desc",
      minDiscount = 0,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const minDiscountNum = parseFloat(minDiscount) || 0;

    // ── 1. Find all active offers that have a discount ──────────────────
    const offerFilter = {
      isActive: true,
      discountPercentage: { $gt: minDiscountNum },
    };

    // Get all discounted active offers
    const discountedOffers = await sellerOfferModel
      .find(offerFilter)
      .select("productId sellerId sellerName price stock discountPercentage warranty image")
      .lean();

    if (!discountedOffers.length) {
      return res.json({ deals: [], totalDeals: 0, currentPage: pageNum, totalPages: 0 });
    }

    // ── 2. Group offers by productId, keeping the best (highest discount) ──
    const offersByProduct = new Map();
    for (const offer of discountedOffers) {
      const pid = offer.productId.toString();
      const existing = offersByProduct.get(pid);
      if (!existing || offer.discountPercentage > existing.discountPercentage) {
        offersByProduct.set(pid, offer);
      }
    }

    // ── 3. Build product filter ─────────────────────────────────────────
    const productIds = [...offersByProduct.keys()];
    const productFilter = { _id: { $in: productIds } };
    if (category && category !== "All") {
      productFilter.category = { $regex: `^${category}$`, $options: "i" };
    }

    // ── 4. Count total matching products ────────────────────────────────
    const totalDeals = await productModel.countDocuments(productFilter);

    // ── 5. Sort + paginate products ──────────────────────────────────────
    let productSort = { createdAt: -1 };
    // We'll sort after enrichment for discount/price sorts (need offer data)
    const products = await productModel
      .find(productFilter)
      .lean()
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // ── 6. Enrich with offer data and compute dynamic discount ──────────
    const deals = products.map((product) => {
      const bestOffer = offersByProduct.get(product._id.toString());
      const originalPrice = bestOffer.price;
      const discountPct = bestOffer.discountPercentage;
      const finalPrice = parseFloat((originalPrice * (1 - discountPct / 100)).toFixed(2));
      const savings = parseFloat((originalPrice - finalPrice).toFixed(2));

      return {
        product: {
          _id: product._id,
          productName: product.productName,
          image: product.image || bestOffer.image || "",
          category: product.category,
          brand: product.brand || "",
          description: product.description || "",
          specs: product.specs || {},
          howManyProductsSold: product.howManyProductsSold || 0,
          createdAt: product.createdAt,
        },
        offer: {
          _id: bestOffer._id,
          sellerName: bestOffer.sellerName,
          originalPrice,
          discountPercentage: discountPct,
          finalPrice,
          savings,
          stock: bestOffer.stock,
          warranty: bestOffer.warranty || "No warranty",
          image: bestOffer.image || "",
        },
      };
    });

    // ── 7. Sort enriched deals ───────────────────────────────────────────
    if (sort === "discount_desc") {
      deals.sort((a, b) => b.offer.discountPercentage - a.offer.discountPercentage);
    } else if (sort === "price_asc") {
      deals.sort((a, b) => a.offer.finalPrice - b.offer.finalPrice);
    } else if (sort === "price_desc") {
      deals.sort((a, b) => b.offer.finalPrice - a.offer.finalPrice);
    } else if (sort === "savings_desc") {
      deals.sort((a, b) => b.offer.savings - a.offer.savings);
    }
    // newest: already sorted by DB query

    res.json({
      deals,
      totalDeals,
      currentPage: pageNum,
      totalPages: Math.ceil(totalDeals / limitNum),
    });
  } catch (error) {
    console.error("❌ GET /api/deals error:", error);
    res.status(500).json({
      deals: [],
      totalDeals: 0,
      message: "Failed to fetch deals",
      error: error.message,
    });
  }
});

/**
 * GET /api/deals/categories
 * Returns categories that have active discounted offers, with counts.
 */
router.get("/categories", async (req, res) => {
  try {
    const discountedOffers = await sellerOfferModel
      .find({ isActive: true, discountPercentage: { $gt: 0 } })
      .select("productId")
      .lean();

    const productIds = [...new Set(discountedOffers.map((o) => o.productId.toString()))];

    const mongoose = await import("mongoose");
    const objectIds = productIds.map((id) => new mongoose.default.Types.ObjectId(id));

    const categories = await productModel.aggregate([
      { $match: { _id: { $in: objectIds } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ categories: categories.map((c) => ({ name: c._id, count: c.count })) });
  } catch (error) {
    console.error("❌ GET /api/deals/categories error:", error);
    res.status(500).json({ categories: [] });
  }
});

export default router;
