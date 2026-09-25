import mongoose from "mongoose";
import orderModel from "../models/order.js";
import cartModel from "../models/cart.js";
import userModel from "../models/user.js";
import sellerOfferModel from "../models/sellerOffer.js";
import productModel from "../models/products.js";
import {
  generateCheckoutHash,
  verifyNotificationSignature,
  mapStatusCodeToPaymentStatus,
  formatAmount
} from "../services/payhereService.js";
import { onOrderPaid } from "../services/accountingService.js";

/**
 * ======================================================
 * PAYMENT CONTROLLER (PAYHERE CHECKOUT & NOTIFY)
 * ======================================================
 */

/**
 * 💳 1. CREATE PAYMENT & ENQUEUE PAYHERE CHECKOUT
 * POST /api/payment/create
 *
 * - Authenticates buyer
 * - Calculates total from trusted backend database pricing
 * - Creates Order with paymentStatus = "pending"
 * - Generates PayHere checkout hash
 * - Returns PayHere checkout payload to frontend
 */
export async function createPayment(req, res) {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. Retrieve user's cart from database
    const cart = await cartModel.findOne({ userId });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2. Calculate trusted backend total from DB offers/products
    let calculatedProductTotal = 0;
    const processedItemsBySeller = {};

    for (const item of cart.items) {
      const offer = await sellerOfferModel.findById(item.sellerOfferId);
      if (!offer) {
        return res.status(400).json({ message: "One of the items in cart is no longer available." });
      }

      const itemPrice = offer.price;
      const itemQty = item.quantity;
      calculatedProductTotal += itemPrice * itemQty;

      const sellerIdStr = offer.sellerId.toString();
      if (!processedItemsBySeller[sellerIdStr]) {
        processedItemsBySeller[sellerIdStr] = [];
      }

      processedItemsBySeller[sellerIdStr].push({
        productId: offer.productId,
        sellerOfferId: offer._id,
        price: itemPrice,
        quantity: itemQty
      });
    }

    const deliveryCharge = req.body.deliveryCharge ? Number(req.body.deliveryCharge) : 0;
    const grandTotal = calculatedProductTotal + deliveryCharge;
    const formattedAmt = formatAmount(grandTotal);

    // 3. Generate unique order ID
    const uniqueOrderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const currency = "LKR";

    // 4. Create Order(s) in MongoDB with paymentStatus = "pending"
    const shippingAddress = req.body.shippingAddress || {
      fullName: user.fullName || user.email || "Customer",
      phone: user.phone || "0770000000",
      street: "Colombo Street",
      city: "Colombo",
      postalCode: "10000"
    };

    const createdOrders = [];
    const sellerIds = Object.keys(processedItemsBySeller);

    for (const sellerId of sellerIds) {
      const itemsForSeller = processedItemsBySeller[sellerId];
      const sellerProdTotal = itemsForSeller.reduce((acc, i) => acc + i.price * i.quantity, 0);
      const sellerTotal = sellerProdTotal + (deliveryCharge / sellerIds.length);

      const newOrder = await orderModel.create({
        orderId: uniqueOrderId,
        userId,
        sellerId,
        items: itemsForSeller,
        productTotal: sellerProdTotal,
        deliveryCharge: deliveryCharge / sellerIds.length,
        totalAmount: sellerTotal,
        currency,
        shippingAddress,
        paymentStatus: "pending",
        status: "pending"
      });
      createdOrders.push(newOrder);
    }

    // 5. Read PayHere credentials from environment variables
    const merchantId = process.env.PAYHERE_MERCHANT_ID || "1234567";
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "4XXXXXXXXXXXX";
    const isSandbox = (process.env.PAYHERE_SANDBOX || "true").toLowerCase() === "true";

    // 6. Generate official PayHere checkout MD5 hash
    const checkoutHash = generateCheckoutHash({
      merchantId,
      orderId: uniqueOrderId,
      amount: grandTotal,
      currency,
      merchantSecret
    });

    // Construct PayHere callback URLs
    const notifyUrl = process.env.PAYHERE_NOTIFY_URL || "http://localhost:8080/api/payment/notify";
    const returnUrl = process.env.PAYHERE_RETURN_URL || `http://localhost:5173/payment/status/${uniqueOrderId}`;
    const cancelUrl = process.env.PAYHERE_CANCEL_URL || `http://localhost:5173/payment/status/${uniqueOrderId}`;

    const itemsSummary = `E-Commerce Order ${uniqueOrderId}`;

    // Return PayHere checkout payload to frontend
    return res.status(201).json({
      message: "Payment initialized successfully",
      payhere: {
        sandbox: isSandbox,
        checkoutUrl: isSandbox
          ? "https://sandbox.payhere.lk/pay/checkout"
          : "https://www.payhere.lk/pay/checkout",
        merchant_id: merchantId,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        order_id: uniqueOrderId,
        items: itemsSummary,
        amount: formattedAmt,
        currency,
        hash: checkoutHash,
        first_name: shippingAddress.fullName || user.fullName || "Customer",
        last_name: "",
        email: user.email || "customer@example.com",
        phone: shippingAddress.phone || user.phone || "0770000000",
        address: shippingAddress.street || "Colombo",
        city: shippingAddress.city || "Colombo",
        country: "Sri Lanka"
      },
      orders: createdOrders
    });
  } catch (error) {
    console.error("❌ createPayment error:", error.message);
    return res.status(500).json({ message: "Error initializing payment", error: error.message });
  }
}

/**
 * 🔔 2. PAYHERE NOTIFY CALLBACK
 * POST /api/payment/notify
 *
 * PayHere posts application/x-www-form-urlencoded data here upon payment processing.
 * Verifies md5sig BEFORE updating paymentStatus.
 */
export async function notifyPayment(req, res) {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      method,
      status_message
    } = req.body;

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || "4XXXXXXXXXXXX";

    // 1. Verify md5sig checksum BEFORE updating payment status
    const isValidSignature = verifyNotificationSignature({
      merchantId: merchant_id,
      orderId: order_id,
      payhereAmount: payhere_amount,
      payhereCurrency: payhere_currency,
      statusCode: status_code,
      md5sig,
      merchantSecret
    });

    if (!isValidSignature) {
      console.warn(`⚠️ PayHere Notification Signature Mismatch for Order: ${order_id}`);
      return res.status(400).send("Invalid PayHere signature checksum");
    }

    // 2. Find matching Order(s) by orderId or Mongoose _id
    const orders = await orderModel.find({
      $or: [{ orderId: order_id }, { _id: order_id }]
    });

    if (!orders || orders.length === 0) {
      console.warn(`⚠️ PayHere Notify: Order ${order_id} not found in database.`);
      return res.status(404).send("Order not found");
    }

    const mappedStatus = mapStatusCodeToPaymentStatus(status_code);

    for (const order of orders) {
      // Prevent duplicate processing if already paid
      if (order.paymentStatus === "paid" && mappedStatus === "paid") {
        continue;
      }

      order.payherePaymentId = payment_id || null;
      order.payhereMethod = method || null;
      order.payhereStatusCode = Number(status_code);
      order.paymentStatus = mappedStatus;

      if (Number(status_code) === 2) {
        // Status 2 = Paid successfully
        order.paymentStatus = "paid";
        order.status = "confirmed";
        order.paymentDate = new Date();

        // Clear buyer's cart after successful payment
        await cartModel.deleteOne({ userId: order.userId });

        // 📒 Record accounting journal entry for this paid order
        try {
          await onOrderPaid(order, payment_id);
        } catch (accountingErr) {
          // Non-blocking: payment still succeeds even if journal fails
          console.error(`⚠️ Accounting journal error for order ${order.orderId}:`, accountingErr.message);
        }
      } else if (Number(status_code) === -1) {
        order.paymentStatus = "cancelled";
      } else if (Number(status_code) === -2) {
        order.paymentStatus = "failed";
      } else if (Number(status_code) === -3) {
        order.paymentStatus = "chargedback";
      }

      await order.save();
    }

    console.log(`✅ PayHere Notification Processed: Order ${order_id} -> ${mappedStatus} (Status Code: ${status_code})`);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("❌ notifyPayment error:", error.message);
    return res.status(500).send("Internal Notification Server Error");
  }
}

/**
 * 🔍 3. GET PAYMENT STATUS
 * GET /api/payment/status/:orderId
 *
 * Returns payment status from MongoDB database.
 */
export async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;

    const orders = await orderModel.find({
      $or: [{ orderId }, { _id: mongoose.isValidObjectId(orderId) ? orderId : null }]
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const primaryOrder = orders[0];
    const overallPaymentStatus = orders.every(o => o.paymentStatus === "paid")
      ? "paid"
      : orders.some(o => o.paymentStatus === "failed")
      ? "failed"
      : orders.some(o => o.paymentStatus === "cancelled")
      ? "cancelled"
      : orders.some(o => o.paymentStatus === "chargedback")
      ? "chargedback"
      : primaryOrder.paymentStatus;

    return res.json({
      orderId: primaryOrder.orderId || primaryOrder._id.toString(),
      paymentStatus: overallPaymentStatus,
      status: primaryOrder.status,
      totalAmount: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      currency: primaryOrder.currency || "LKR",
      payhereMethod: primaryOrder.payhereMethod,
      paymentDate: primaryOrder.paymentDate,
      ordersCount: orders.length
    });
  } catch (error) {
    console.error("❌ getPaymentStatus error:", error.message);
    return res.status(500).json({ message: "Error fetching payment status", error: error.message });
  }
}
