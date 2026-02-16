import productModel from "../models/products.js";
import TopProduct from "../models/topProducts.js";

/**
 * CREATE PRODUCT
 */
export function createProduct(req, res) {
  const productData = new productModel({
    price: req.body.price,
    productName: req.body.productName,
    sellerName: req.body.sellerName,
    image: req.body.image,
    warranty: req.body.warranty,
    category: req.body.category,
    isAvailable: true
  });

  productData
    .save()
    .then(() => {
      // 🔹 Text index is updated automatically by MongoDB
      res.json({ message: "Product created successfully" });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Error creating product",
        error: error.message
      });
    });
}

/**
 * UPDATE PRODUCT
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

    // 🔹 MongoDB updates text index automatically
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
 * DELETE PRODUCT
 */
export async function deleteProduct(req, res) {
  try {
    const deleted = await productModel.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Remove from AI ranking table
    await TopProduct.deleteMany({ productId: req.params.id });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting product",
      error: error.message
    });
  }
}

/**
 * BROWSE PRODUCT LISTING + 🔍 KEYWORD SEARCH (TEXT INDEX)
 * GET /api/products
 */
export async function getAllProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 8,
      search,        // 🔍 keyword search
      minPrice,
      maxPrice,
      category,
      available,
      sort
    } = req.query;

    let query = {};

    /* 🔍 KEYWORD SEARCH (USING INVERTED INDEX) */
    if (search) {
      query.$text = { $search: search };
    }

    /* CATEGORY FILTER */
    if (category) {
      query.category = category;
    }

    /* PRICE FILTER */
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    /* AVAILABILITY FILTER */
    if (available !== undefined) {
      query.isAvailable = available === "true";
    }

    /* SORTING */
    let sortOption = {};
    if (search) {
      // 🔹 Sort by relevance if searching
      sortOption = { score: { $meta: "textScore" } };
    } else {
      if (sort === "price_asc") sortOption.price = 1;
      if (sort === "price_desc") sortOption.price = -1;
      if (sort === "latest") sortOption.createdAt = -1;
      if (sort === "popular") sortOption.howManyproductsSold = -1;
    }

    const products = await productModel
      .find(
        query,
        search ? { score: { $meta: "textScore" } } : {}
      )
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalProducts = await productModel.countDocuments(query);

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
 * PRODUCT DETAILS
 * GET /api/products/:id
 */
export async function getProductById(req, res) {
  try {
    const product = await productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching product",
      error: error.message
    });
  }
}

/**
 * GET TOP 3 PRODUCTS (AI)
 */
export async function getTopThreeProducts(req, res) {
  try {
    const topProducts = await TopProduct.find()
      .sort({ rank: 1 })
      .limit(3)
      .populate("productId");

    const response = topProducts.map((item) => ({
      productId: item.productId._id,
      productName: item.productId.productName,
      sellerName: item.productId.sellerName,
      image: item.productId.image,
      score: item.score
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch top products",
      error: error.message
    });
  }
}

/**
 * 🔍 SEARCH PRODUCTS (POST)
 * POST /api/products/search
 */
export async function searchProductsPost(req, res) {
  try {
    const {
      search,
      minPrice,
      maxPrice,
      category,
      available,
      page = 1,
      limit = 8
    } = req.body;

    let query = {};

    // 🔍 KEYWORD SEARCH (TEXT INDEX)
    if (search) {
      query.$text = { $search: search };
    }

    // CATEGORY FILTER
    if (category) {
      query.category = category;
    }

    // PRICE FILTER
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // AVAILABILITY FILTER
    if (available !== undefined) {
      query.isAvailable = available;
    }

    const products = await productModel
      .find(
        query,
        search ? { score: { $meta: "textScore" } } : {}
      )
      .sort(
        search ? { score: { $meta: "textScore" } } : { createdAt: -1 }
      )
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalProducts = await productModel.countDocuments(query);

    res.json({
      products,
      totalProducts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalProducts / limit)
    });

  } catch (error) {
    console.error("❌ POST SEARCH ERROR:", error);

    res.status(500).json({
      message: "Search failed",
      error: error.message
    });
  }
}
