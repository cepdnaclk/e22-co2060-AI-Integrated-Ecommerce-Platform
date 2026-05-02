import Cart from "../models/cart.js";
import sellerOfferModel from "../models/sellerOffer.js";

/**
 * ======================================================
 * CART CONTROLLER
 * ======================================================
 * Responsibilities:
 * - Add item to cart
 * - Update cart item quantity
 * - Remove item from cart
 * - Get cart with computed total price
 *
 * IMPORTANT:
 * - Cart is seller-offer based
 * - Price is locked from SellerOffer
 * - totalPrice is COMPUTED (not stored)
 * ======================================================
 */


/**
 * ======================================================
 * ADD ITEM TO CART
 * POST /api/cart/add
 * ======================================================
 */
export async function addToCart(req, res) {
  try {
    const { sellerOfferId, quantity = 1, variantId = null } = req.body;

    // 1️⃣ Get seller offer
    const offer = await sellerOfferModel.findById(sellerOfferId);

    if (!offer || !offer.isActive) {
      return res.status(404).json({
        message: "Seller offer not available"
      });
    }

    // 2️⃣ Find or create cart
    let cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        userId: req.user.id,
        items: []
      });
    }

    // 3️⃣ Check if same offer+variant already exists in cart
    const variantKey = variantId ? variantId.toString() : "none";
    const existingItem = cart.items.find(
      (item) =>
        item.sellerOfferId.toString() === sellerOfferId &&
        (item.variantId ? item.variantId.toString() : "none") === variantKey
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId: offer.productId,
        sellerOfferId: offer._id,
        sellerId: offer.sellerId,
        price: offer.price, // 🔒 price locked here
        variantId: variantId || null,
        quantity
      });
    }

    await cart.save();

    res.status(200).json({
      message: "Item added to cart successfully",
      cart
    });

  } catch (error) {
    console.error("❌ Add to cart error:", error);
    res.status(500).json({
      message: "Failed to add item to cart",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * UPDATE CART ITEM QUANTITY
 * PUT /api/cart/update
 * ======================================================
 */
export async function updateCartItem(req, res) {
  try {
    const { sellerOfferId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        message: "Quantity must be at least 1"
      });
    }

    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found"
      });
    }

    const item = cart.items.find(
      (i) => i.sellerOfferId.toString() === sellerOfferId
    );

    if (!item) {
      return res.status(404).json({
        message: "Item not found in cart"
      });
    }

    item.quantity = quantity;
    await cart.save();

    res.json({
      message: "Cart item updated successfully",
      cart
    });

  } catch (error) {
    console.error("❌ Update cart error:", error);
    res.status(500).json({
      message: "Failed to update cart",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * REMOVE ITEM FROM CART
 * DELETE /api/cart/remove
 * ======================================================
 */
export async function removeCartItem(req, res) {
  try {
    const { sellerOfferId } = req.body;

    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found"
      });
    }

    cart.items = cart.items.filter(
      (item) => item.sellerOfferId.toString() !== sellerOfferId
    );

    await cart.save();

    res.json({
      message: "Item removed from cart",
      cart
    });

  } catch (error) {
    console.error("❌ Remove cart item error:", error);
    res.status(500).json({
      message: "Failed to remove item from cart",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * GET CART (WITH TOTAL PRICE)
 * GET /api/cart
 * ======================================================
 */
export async function getCart(req, res) {
  try {
    const cart = await Cart.findOne({ userId: req.user.id })
      .populate("items.productId", "productName image")
      .populate("items.sellerId", "shopName")
      .populate("items.variantId", "variantName color storage size image");

    if (!cart) {
      return res.json({
        items: [],
        totalPrice: 0
      });
    }

    // 🔢 Compute total price dynamically
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    res.json({
      cart,
      totalPrice
    });

  } catch (error) {
    console.error("❌ Get cart error:", error);
    res.status(500).json({
      message: "Failed to fetch cart",
      error: error.message
    });
  }
}
