import Cart from "../models/cart.js";
import Order from "../models/order.js";

/**
 * ======================================================
 * ORDER CONTROLLER
 * ======================================================
 * Responsibilities:
 * - Checkout (cart → orders)
 * - Split orders by seller
 * - Buyer order history
 * - Seller order view
 * ======================================================
 */


/**
 * ======================================================
 * CREATE ORDER (CHECKOUT)
 * POST /api/orders
 * ======================================================
 */
export async function createOrder(req, res) {
  try {
    const { shippingAddress } = req.body;

    // 1️⃣ Get user's cart
    const cart = await Cart.findOne({ userId: req.user.id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty"
      });
    }

    /**
     * 2️⃣ Group cart items by sellerId
     */
    const groupedBySeller = {};

    cart.items.forEach((item) => {
      const sellerId = item.sellerId.toString();

      if (!groupedBySeller[sellerId]) {
        groupedBySeller[sellerId] = [];
      }

      groupedBySeller[sellerId].push(item);
    });

    /**
     * 3️⃣ Create one order PER seller
     */
    const createdOrders = [];

    for (const sellerId in groupedBySeller) {
      const items = groupedBySeller[sellerId];

      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const order = await Order.create({
        userId: req.user.id,
        sellerId,
        items: items.map((item) => ({
          productId: item.productId,
          sellerOfferId: item.sellerOfferId,
          price: item.price,
          quantity: item.quantity
        })),
        totalAmount,
        ...(shippingAddress && { shippingAddress })
      });

      createdOrders.push(order);
    }

    /**
     * 4️⃣ Clear cart after successful checkout
     */
    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: "Order placed successfully",
      orders: createdOrders
    });

  } catch (error) {
    console.error("❌ Create order error:", error);
    res.status(500).json({
      message: "Failed to place order",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * GET BUYER ORDERS
 * GET /api/orders/my
 * ======================================================
 */
export async function getMyOrders(req, res) {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate("sellerId", "shopName")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    console.error("❌ Get buyer orders error:", error);
    res.status(500).json({
      message: "Failed to fetch orders",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * GET SELLER ORDERS
 * GET /api/orders/seller/:sellerId
 * ======================================================
 */
export async function getSellerOrders(req, res) {
  try {
    const { sellerId } = req.params;

    const orders = await Order.find({ sellerId })
      .populate("userId", "email")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    console.error("❌ Get seller orders error:", error);
    res.status(500).json({
      message: "Failed to fetch seller orders",
      error: error.message
    });
  }
}
