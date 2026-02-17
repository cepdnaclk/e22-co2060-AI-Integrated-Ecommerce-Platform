import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";
import TopProduct from "../models/topProducts.js";

/**
 * ✅ CREATE PRODUCT (ADMIN ONLY)
 * Product = global catalog item
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
 * ✅ UPDATE PRODUCT (ADMIN ONLY)
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
 * ✅ DELETE PRODUCT (ADMIN ONLY)
 * Also removes seller offers + AI rankings
 */
export async function deleteProduct(req, res) {
  try {
    const productId = req.params.id;

    const deleted = await productModel.findByIdAndDelete(productId);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    // remove related seller offers
    await sellerOfferModel.deleteMany({ productId });

    // remove AI ranking
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
 * ✅ BROWSE PRODUCTS + SEARCH + FILTER
 * GET /api/products
 */
export async function getAllProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 8,
      search,
      category,
      sort
    } = req.query;

    const pipeline = [];

    /* 🔍 TEXT SEARCH */
    if (search) {
      pipeline.push(
        { $match: { $text: { $search: search } } },
        { $addFields: { score: { $meta: "textScore" } } }
      );
    }

    /* CATEGORY FILTER */
    if (category) {
      pipeline.push({ $match: { category } });
    }

    /* JOIN SELLER OFFERS */
    pipeline.push({
      $lookup: {
        from: "selleroffers",
        localField: "_id",
        foreignField: "productId",
        as: "offers"
      }
    });

    /* MARKETPLACE CALCULATIONS */
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

    /* SORTING */
    if (search) {
      pipeline.push({ $sort: { score: -1 } });
    } else if (sort === "price_asc") {
      pipeline.push({ $sort: { minPrice: 1 } });
    } else if (sort === "price_desc") {
      pipeline.push({ $sort: { minPrice: -1 } });
    } else if (sort === "latest") {
      pipeline.push({ $sort: { createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    /* PAGINATION */
    pipeline.push(
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    /* CLEAN RESPONSE */
    pipeline.push({ $project: { offers: 0 } });

    const products = await productModel.aggregate(pipeline);

    const totalProducts = await productModel.countDocuments(
      search ? { $text: { $search: search } } : {}
    );

    res.json({
      products,
      totalProducts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalProducts / limit)
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message
    });
  }
}

/**
 * ✅ PRODUCT DETAILS + ALL SELLERS
 * GET /api/products/:id
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
 * ✅ TOP 3 PRODUCTS (AI)
 * Uses marketplace data now
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
