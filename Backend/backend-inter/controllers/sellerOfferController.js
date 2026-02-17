import sellerOfferModel from "../models/sellerOffer.js";

/**
 * ✅ SELLER CREATES AN OFFER FOR A PRODUCT
 */
export async function addSellerOffer(req, res) {
  try {
    const {
      productId,
      price,
      stock,
      warranty
    } = req.body;

    const offer = await sellerOfferModel.create({
      productId,
      sellerId: req.user.id,
      sellerName: req.user.email, // or shopName if you have it
      price,
      stock,
      warranty
    });

    res.status(201).json({
      message: "Seller offer created successfully",
      offer
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create seller offer",
      error: error.message
    });
  }
}
