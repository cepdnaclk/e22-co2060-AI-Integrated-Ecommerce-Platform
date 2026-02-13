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
  });

  productData
    .save()
    .then(() => {
      res.json({ message: "Product created successfully" });
    })
    .catch((error) => {
      res.status(500).json({
        message: "Error creating product",
        error: error.message,
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
      { new: true } // return updated document
    );

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated successfully",
      product: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating product",
      error: error.message,
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

    // Optional: remove from AI ranking table also
    await TopProduct.deleteMany({ productId: req.params.id });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting product",
      error: error.message,
    });
  }
}

/**
 * GET TOP 3 PRODUCTS
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
      score: item.score,
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch top products",
      error: error.message,
    });
  }
}
