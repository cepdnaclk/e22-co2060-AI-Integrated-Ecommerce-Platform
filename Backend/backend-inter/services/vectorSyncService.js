import productModel from "../models/products.js";
import sellerOfferModel from "../models/sellerOffer.js";

/**
 * 🧠 Vector Sync Service for MongoDB Atlas RAG & Search Integration
 * 
 * Responsible for:
 * 1. Calculating denormalized price & stock metrics from SellerOffers for a Product
 * 2. Generating standardized, rich product text representation for vector embeddings
 * 3. Updating Product metadata fields (minPrice, maxPrice, totalStock, hasActiveOffers)
 * 4. Providing safe read-only preview capabilities
 */

/**
 * Calculates denormalized price and stock metrics from a list of SellerOffers.
 * 
 * @param {Array} sellerOffers Array of SellerOffer documents
 * @returns {Object} { minPrice, maxPrice, totalStock, hasActiveOffers }
 */
export function calculateProductMetrics(sellerOffers = []) {
  // Filter for valid active seller offers
  const activeOffers = (sellerOffers || []).filter(
    (offer) => offer && offer.isActive === true && typeof offer.price === "number" && !isNaN(offer.price) && offer.price >= 0
  );

  if (activeOffers.length === 0) {
    return {
      minPrice: null,
      maxPrice: null,
      totalStock: 0,
      hasActiveOffers: false,
    };
  }

  const prices = activeOffers.map((o) => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const totalStock = activeOffers.reduce((sum, offer) => {
    const stockVal = typeof offer.stock === "number" && !isNaN(offer.stock) && offer.stock >= 0 ? offer.stock : 0;
    return sum + stockVal;
  }, 0);

  return {
    minPrice,
    maxPrice,
    totalStock,
    hasActiveOffers: true,
  };
}

/**
 * Formats product specs object into a clean string representation.
 * 
 * @param {Object|Array|String} specs 
 * @returns {String}
 */
function formatSpecs(specs) {
  if (!specs) return "N/A";
  if (typeof specs === "string") return specs.trim() || "N/A";
  if (typeof specs === "object") {
    try {
      const entries = Object.entries(specs)
        .filter(([k, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`);
      return entries.length > 0 ? entries.join(" | ") : "N/A";
    } catch (e) {
      return JSON.stringify(specs);
    }
  }
  return String(specs);
}

/**
 * Constructs a rich text representation of a product and its offer metrics
 * that will be passed to Gemini embedding models for RAG indexing.
 * 
 * @param {Object} product Product document
 * @param {Object} metrics { minPrice, maxPrice, totalStock, hasActiveOffers }
 * @returns {String} Standardized embedding text
 */
export function generateProductEmbeddingText(product, metrics) {
  if (!product) return "";

  const name = product.productName ? product.productName.trim() : "Unknown Product";
  const brand = product.brand ? product.brand.trim() : "N/A";
  const category = product.category ? product.category.trim() : "N/A";
  const description = product.description ? product.description.trim() : "N/A";
  const specsFormatted = formatSpecs(product.specs);

  let priceRangeText = "No active pricing available";
  if (metrics.hasActiveOffers && metrics.minPrice !== null) {
    if (metrics.minPrice === metrics.maxPrice) {
      priceRangeText = `LKR ${metrics.minPrice.toLocaleString()}`;
    } else {
      priceRangeText = `LKR ${metrics.minPrice.toLocaleString()} - LKR ${metrics.maxPrice.toLocaleString()}`;
    }
  }

  const stockStatusText = metrics.hasActiveOffers && metrics.totalStock > 0 ? "In Stock" : "Out of Stock";

  return [
    `Product: ${name}`,
    `Brand: ${brand}`,
    `Category: ${category}`,
    `Price Range: ${priceRangeText}`,
    `Stock Status: ${stockStatusText}`,
    `Total Stock: ${metrics.totalStock}`,
    `Available From Active Sellers: ${metrics.hasActiveOffers ? "Yes" : "No"}`,
    `Description: ${description}`,
    `Specifications: ${specsFormatted}`,
  ].join("\n");
}

/**
 * Safe read-only preview function.
 * Retrieves product and active seller offers, calculates metrics, and generates embedding text.
 * DOES NOT modify the database.
 * 
 * @param {String} productId 
 * @returns {Object} Preview details { productId, productName, minPrice, maxPrice, totalStock, hasActiveOffers, embeddingText }
 */
export async function previewProductEmbedding(productId) {
  if (!productId) {
    throw new Error("productId parameter is required");
  }

  const product = await productModel.findById(productId).lean();
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const offers = await sellerOfferModel.find({ productId, isActive: true }).lean();
  const metrics = calculateProductMetrics(offers);
  const embeddingText = generateProductEmbeddingText(product, metrics);

  return {
    productId: product._id.toString(),
    productName: product.productName,
    category: product.category,
    brand: product.brand,
    approvalStatus: product.approvalStatus,
    minPrice: metrics.minPrice,
    maxPrice: metrics.maxPrice,
    totalStock: metrics.totalStock,
    hasActiveOffers: metrics.hasActiveOffers,
    activeOffersCount: offers.length,
    embeddingText,
  };
}

/**
 * Calculates and updates RAG metadata fields on the Product document in MongoDB.
 * Note: Embedding generation (Gemini API) will be connected in a future stage.
 * 
 * @param {String} productId 
 * @returns {Object} { product, metrics, embeddingText }
 */
export async function syncProductEmbedding(productId) {
  if (!productId) {
    throw new Error("productId parameter is required");
  }

  const product = await productModel.findById(productId);
  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const offers = await sellerOfferModel.find({ productId, isActive: true }).lean();
  const metrics = calculateProductMetrics(offers);
  const embeddingText = generateProductEmbeddingText(product, metrics);

  // Update Product metadata fields
  product.minPrice = metrics.minPrice;
  product.maxPrice = metrics.maxPrice;
  product.totalStock = metrics.totalStock;
  product.hasActiveOffers = metrics.hasActiveOffers;
  product.embeddingUpdatedAt = new Date();

  /* 
   * NOTE: Gemini vector embedding generation (text-embedding-004)
   * will be populated in vectorSyncService during Stage 4.
   */

  await product.save();

  return {
    product,
    metrics,
    embeddingText,
  };
}

export default {
  calculateProductMetrics,
  generateProductEmbeddingText,
  previewProductEmbedding,
  syncProductEmbedding,
};
