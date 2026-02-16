import productModel from "../models/products.js";

export async function searchProductService(keyword) {
  return await productModel
    .find(
      { $text: { $search: keyword } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } });
}
