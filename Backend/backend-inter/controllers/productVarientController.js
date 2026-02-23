import ProductVariant from "../models/productVariant.js";
import Product from "../models/products.js";

/* =========================
   CREATE VARIANT
========================= */
export const createVariant = async (req, res) => {
  try {
    const { productId, sku, attributes, image } = req.body;

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = await ProductVariant.create({
      product: productId,
      sku,
      attributes,
      image
    });

    res.status(201).json(variant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   GET VARIANTS BY PRODUCT
========================= */
export const getVariantsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const variants = await ProductVariant.find({
      product: productId,
      isActive: true
    });

    res.json(variants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};