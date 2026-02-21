import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";
import TopProduct from "../models/topProducts.js";
import ProductVariant from "../models/productVariant.js";

/**
 * ======================================================
 * CREATE PRODUCT (ADMIN)
 * ======================================================
 */
export async function createProduct(req, res) {
  try {
    const product = await productModel.create({
      productName: req.body.productName,
      image: req.body.image,
      category: req.body.category,
      description: req.body.description,
      brand: req.body.brand,
      specs: req.body.specs
    });

    res.status(201).json({
      message: "Product created successfully",
      product
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating product",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * UPDATE PRODUCT (ADMIN)
 * ======================================================
 */
export async function updateProduct(req, res) {
  try {
    const updated = await productModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated successfully",
      product: updated
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating product",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * DELETE PRODUCT (ADMIN)
 * ======================================================
 */
export async function deleteProduct(req, res) {
  try {
    const productId = req.params.id;

    const deleted = await productModel.findByIdAndDelete(productId);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    await sellerOfferModel.deleteMany({ productId });
    await TopProduct.deleteMany({ productId });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting product",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * GET ALL PRODUCTS (BROWSE + SEARCH + FILTER)
 * FIXED VERSION
 * ======================================================
 */
export async function getAllProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 8,
      search,
      category,
      sort = "latest"
    } = req.query;

    const pipeline = [];

    /* 🔍 SAFE SEARCH (NO $text BUGS) */
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    /* 📂 CATEGORY FILTER (FIXED null ISSUE) */
    if (category && category !== "null") {
      pipeline.push({ $match: { category } });
    }

    /* 🔗 JOIN SELLER OFFERS */
    pipeline.push({
      $lookup: {
        from: "selleroffers",
        localField: "_id",
        foreignField: "productId",
        as: "offers"
      }
    });

    /* 📊 MARKETPLACE CALCULATIONS */
    pipeline.push({
      $addFields: {
        sellerCount: {
          $size: {
            $filter: {
              input: "$offers",
              as: "o",
              cond: { $eq: ["$$o.isActive", true] }
            }
          }
        },
        minPrice: {
          $min: {
            $map: {
              input: {
                $filter: {
                  input: "$offers",
                  as: "o",
                  cond: { $eq: ["$$o.isActive", true] }
                }
              },
              as: "x",
              in: "$$x.price"
            }
          }
        }
      }
    });

    /* ↕ SORTING */
    if (sort === "price_asc") {
      pipeline.push({ $sort: { minPrice: 1 } });
    } else if (sort === "price_desc") {
      pipeline.push({ $sort: { minPrice: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    /* 📄 PAGINATION */
    pipeline.push(
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    /* 🧹 CLEAN RESPONSE */
    pipeline.push({ $project: { offers: 0 } });

    /* 📦 FETCH PRODUCTS */
    const products = await productModel.aggregate(pipeline);

    /* 🔢 TOTAL COUNT (WITHOUT SKIP/LIMIT) */
    const countPipeline = pipeline.filter(
      stage => !("$skip" in stage) && !("$limit" in stage)
    );

    const countResult = await productModel.aggregate([
      ...countPipeline,
      { $count: "total" }
    ]);

    const totalProducts = countResult[0]?.total || 0;

    res.json({
      products,                 // ✅ ALWAYS ARRAY
      totalProducts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalProducts / limit)
    });

  } catch (error) {
    console.error("❌ getAllProducts error:", error);
    res.status(500).json({
      products: [],
      totalProducts: 0,
      message: "Failed to fetch products",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * PRODUCT DETAILS + SELLER OFFERS
 * ======================================================
 */
export async function getProductById(req, res) {
  try {
    const product = await productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const offers = await sellerOfferModel
      .find({ productId: req.params.id, isActive: true })
      .select("-__v");

    res.json({
      product,
      offers
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * TOP 3 PRODUCTS (AI)
 * ======================================================
 */
export async function getTopThreeProducts(req, res) {
  try {
    const topProducts = await TopProduct.find()
      .sort({ rank: 1 })
      .limit(3)
      .populate("productId");

    const response = await Promise.all(
      topProducts.map(async (item) => {
        const minOffer = await sellerOfferModel
          .find({ productId: item.productId._id, isActive: true })
          .sort({ price: 1 })
          .limit(1);

        return {
          productId: item.productId._id,
          productName: item.productId.productName,
          image: item.productId.image,
          minPrice: minOffer[0]?.price || null,
          score: item.score
        };
      })
    );

    res.json(response);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch top products",
      error: error.message
    });
  }
}

/**
 * ======================================================
 * GET VARIANTS FOR A PRODUCT
 * ======================================================
 * ROUTE: GET /api/products/:id/variants
 */
export async function getVariantsByProduct(req, res) {
  try {
    const variants = await ProductVariant.find(
      { productId: req.params.id, isActive: true }
    ).sort({ variantName: 1 });

    res.json(variants);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch variants", error: error.message });
  }
}

/**
 * ======================================================
 * CREATE VARIANT (ADMIN)
 * ======================================================
 * ROUTE: POST /api/products/:id/variants
 * Body: { variantName, color, storage, size, attributes, image }
 */
export async function createVariant(req, res) {
  try {
    const { variantName, color, storage, size, attributes, image } = req.body;

    const variant = new ProductVariant({
      productId: req.params.id,
      variantName,
      color: color || "",
      storage: storage || "",
      size: size || "",
      attributes: attributes || {},
      image: image || "",
    });
    // pre-save hook will build searchText automatically
    await variant.save();

    // Enrich searchText with parent product name for richer indexing
    const product = await productModel.findById(req.params.id).lean();
    if (product) {
      variant.searchText = `${product.productName} ${product.brand ?? ""} ${variant.searchText}`.toLowerCase();
      await variant.save();
    }

    res.status(201).json({ message: "Variant created", variant });
  } catch (error) {
    res.status(500).json({ message: "Failed to create variant", error: error.message });
  }
}