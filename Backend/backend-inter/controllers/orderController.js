import Cart from "../models/cart.js";
import Order from "../models/order.js";
import Seller from "../models/seller.js";
import QRCode from "qrcode";
import { postOrderPaidEventWithRetry } from "../services/bookkeepingService.js";
import {
  buildSellerQrPayload,
  buildSellerQrText,
  isLatestSellerQrPayload
} from "../services/sellerQrPayloadService.js";

/**
 * ======================================================
 * ORDER CONTROLLER
 * ======================================================
 * Responsibilities:
 * - Checkout (cart → orders)
 * - Split orders by seller
 * - Buyer order history
 * - Seller order view
 * - Seller proof upload + seller QR retrieval
 * ======================================================
 */

async function getSellerFromAuthUser(user) {
  if (user.role !== "seller") {
    return null;
  }

  return Seller.findOne({ userId: user.id });
}


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

    const bookkeepingResults = await Promise.allSettled(
      createdOrders.map((order) => postOrderPaidEventWithRetry(order))
    );
    const failedBookkeeping = bookkeepingResults
      .map((result, index) => ({ result, order: createdOrders[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, order }) => ({
        orderId: order._id?.toString(),
        error: result.reason?.message || "Unknown bookkeeping sync error"
      }));

    if (failedBookkeeping.length > 0) {
      console.error("⚠️ Bookkeeping sync failures after checkout:", failedBookkeeping);
    }

    res.status(201).json({
      message: "Order placed successfully",
      orders: createdOrders,
      bookkeeping: {
        syncedCount: createdOrders.length - failedBookkeeping.length,
        failedCount: failedBookkeeping.length,
        failedOrders: failedBookkeeping
      }
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
 * GET AUTHENTICATED SELLER ORDERS
 * GET /api/orders/seller/me
 * ======================================================
 */
export async function getMySellerOrders(req, res) {
  try {
    const seller = await getSellerFromAuthUser(req.user);

    if (!seller) {
      return res.status(403).json({ message: "Access denied. Seller account required." });
    }

    const orders = await Order.find({ sellerId: seller._id })
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("❌ Get authenticated seller orders error:", error);
    res.status(500).json({
      message: "Failed to fetch seller orders",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * SELLER SUBMITS PACKING PROOF
 * POST /api/orders/seller/me/:orderId/packing-proof
 * Body (multipart/form-data): productName, skuOrImei, proofImage
 * ======================================================
 */
export async function submitSellerPackingProof(req, res) {
  try {
    const seller = await getSellerFromAuthUser(req.user);
    if (!seller) {
      return res.status(403).json({ message: "Access denied. Seller account required." });
    }

    const { orderId } = req.params;
    const { productName, skuOrImei } = req.body;

    if (!productName?.trim()) {
      return res.status(400).json({ message: "Packed product name is required." });
    }
    if (!skuOrImei?.trim()) {
      return res.status(400).json({ message: "SKU/IMEI is required." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Packing proof image is required." });
    }
    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Packing proof must be an image file." });
    }

    const order = await Order.findOne({ _id: orderId, sellerId: seller._id })
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName");

    if (!order) {
      return res.status(404).json({ message: "Order not found for this seller." });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Cannot submit proof for a cancelled order." });
    }

    const proofImageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    order.sellerQr = {
      ...order.sellerQr,
      verificationStatus: "pending",
      proofImageUrl,
      packingProductName: productName.trim(),
      packingSkuOrImei: skuOrImei.trim(),
      proofSubmittedAt: new Date(),
      proofSubmittedBy: req.user.id,
      verificationNote: "",
      verifiedBy: null,
      verifiedAt: null,
      qrPayload: null,
      qrGeneratedAt: null
    };

    await order.save();

    res.json({
      message: "Packing proof submitted successfully. Waiting for admin verification.",
      order
    });
  } catch (error) {
    console.error("❌ Submit seller packing proof error:", error);
    res.status(500).json({
      message: "Failed to submit packing proof",
      error: error.message
    });
  }
}


/**
 * ======================================================
 * GET SELLER QR FOR AN ORDER
 * GET /api/orders/seller/me/:orderId/seller-qr
 * ======================================================
 */
export async function getSellerOrderQr(req, res) {
  try {
    const seller = await getSellerFromAuthUser(req.user);
    if (!seller) {
      return res.status(403).json({ message: "Access denied. Seller account required." });
    }

    const order = await Order.findOne({ _id: req.params.orderId, sellerId: seller._id })
      .populate("userId", "email firstName lastName phone")
      .populate("sellerId", "shopName email")
      .populate("items.productId", "productName");

    if (!order) {
      return res.status(404).json({ message: "Order not found for this seller." });
    }

    if (order.sellerQr?.verificationStatus !== "approved") {
      return res.status(403).json({
        message: "Seller QR is available only after admin approval.",
        verificationStatus: order.sellerQr?.verificationStatus || "not_submitted"
      });
    }

    let qrPayload = order.sellerQr?.qrPayload;
    if (!isLatestSellerQrPayload(qrPayload)) {
      qrPayload = buildSellerQrPayload(order);
      order.sellerQr = {
        ...order.sellerQr,
        qrPayload,
        qrGeneratedAt: new Date()
      };
      await order.save();
    }

    const qrText = qrPayload.qrText || buildSellerQrText(qrPayload);
    const qrImageDataUrl = await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: "L",
      version: 3,
      margin: 2,
      scale: 10,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    res.json({
      message: "Seller QR generated successfully.",
      verificationStatus: order.sellerQr.verificationStatus,
      qrGeneratedAt: order.sellerQr.qrGeneratedAt,
      qrPayload,
      qrText,
      qrImageDataUrl
    });
  } catch (error) {
    console.error("❌ Get seller QR error:", error);
    res.status(500).json({
      message: "Failed to generate seller QR",
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
