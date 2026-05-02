import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";
import TopProduct from "../models/topProducts.js";
import ProductVariant from "../models/productVariant.js";
import axios from "axios";

/**
 * ======================================================
 * HELPER: TRIGGER N8N AUTOMATION
 * ======================================================
 */
const triggerN8nAutomation = async (product) => {
  try {
    // This URL points to your n8n container within the Docker network
    const n8nWebhookUrl = 'http://ecommerce-n8n:5678/webhook/new-product';
    
    await axios.post(n8nWebhookUrl, {
      eventName: 'NEW_PRODUCT_UPLOAD',
      productName: product.productName,
      price: "TBD", // Initial price usually set by sellers later
      description: product.description,
      imageUrl: product.image,
      productId: product._id,
      category: product.category,
      brand: product.brand
    });
    console.log(`✅ n8n Automation triggered for: ${product.productName}`);
  } catch (error) {
    console.error('❌ n8n Automation Trigger Failed:', error.message);
  }
};

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

    // ✅ TRIGGER AUTOMATION: Send data to n8n for Email & Facebook
    await triggerN8nAutomation(product);

    res.status(201).json({
      message: "Product created successfully and automation triggered",
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

    if (category && category !== "null") {
      pipeline.push({ $match: { category } });
    }

    pipeline.push({
      $lookup: {
        from: "selleroffers",
        localField: "_id",
        foreignField: "productId",
        as: "offers"
      }
    });

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

    if (sort === "price_asc") {
      pipeline.push({ $sort: { minPrice: 1 } });
    } else if (sort === "price_desc") {
      pipeline.push({ $sort: { minPrice: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    pipeline.push({ $project: { offers: 0 } });

    const products = await productModel.aggregate(pipeline);

    const countPipeline = pipeline.filter(
      stage => !("$skip" in stage) && !("$limit" in stage)
    );

    const countResult = await productModel.aggregate([
      ...countPipeline,
      { $count: "total" }
    ]);

    const totalProducts = countResult[0]?.total || 0;

    res.json({
      products,
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
      .populate("variantIds", "variantName color storage size image")
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
 * GET ALL PRODUCTS FOR ADMIN
 * ======================================================
 */
export async function getAdminAllProducts(req, res) {
  try {
    const { page = 1, limit = 20, search, category } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (category && category !== "all") {
      filter.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      productModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      productModel.countDocuments(filter),
    ]);

    const enriched = await Promise.all(
      products.map(async (p) => {
        const variantCount = await ProductVariant.countDocuments({ productId: p._id });
        return { ...p, variantCount };
      })
    );

    res.json({
      products: enriched,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

/**
 * ======================================================
 * CREATE VARIANT (ADMIN) - ALSO UPDATED TO TRIGGER N8N
 * ======================================================
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
    
    await variant.save();

    const product = await productModel.findById(req.params.id).lean();
    if (product) {
      variant.searchText = `${product.productName} ${product.brand ?? ""} ${variant.searchText}`.toLowerCase();
      await variant.save();
      
      // ✅ TRIGGER AUTOMATION: Optionally alert n8n when a new variant is added
      await axios.post('http://ecommerce-n8n:5678/webhook/new-variant', {
        productName: product.productName,
        variantName: variant.variantName,
        imageUrl: variant.image || product.image
      }).catch(e => console.log("n8n variant trigger skipped"));
    }

    res.status(201).json({ message: "Variant created", variant });
  } catch (error) {
    res.status(500).json({ message: "Failed to create variant", error: error.message });
  }
}

// ... Rest of update/delete variant functions stay the same