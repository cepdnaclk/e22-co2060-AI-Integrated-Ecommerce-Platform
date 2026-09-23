import TopProduct from "../models/topProducts.js";

export const saveAIResults = async (req, res) => {
  await TopProduct.deleteMany({});
  await TopProduct.insertMany(req.body.results);

  res.json({ success: true });
};
