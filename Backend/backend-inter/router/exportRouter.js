// routes/exportRouter.js
import express from "express";
import Product from "../models/products.js";
import Seller from "../models/seller.js";
import SellerOffer from "../models/sellerOffer.js";

const router = express.Router();

router.get("/export-all", async (req, res) => {
  const data = {
    products: await Product.find(),
    sellers: await Seller.find(),
    sellerOffers: await SellerOffer.find()
  };

  res.setHeader("Content-Disposition", "attachment; filename=export.json");
  res.json(data);
});

export default router;