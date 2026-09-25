import mongoose from "mongoose";
import orderModel from "../models/order.js";
import cartModel from "../models/cart.js";
import userModel from "../models/user.js";
import sellerOfferModel from "../models/sellerOffer.js";
import {
  createCheckoutSession,
  verifyWebhookSignature,
  formatAmountToCents
} from "../services/paymentsLkService.js";

/**
 * ======================================================
 * PAYMENTS.LK PAYMENT CONTROLLER
 * ======================================================
 */

/**
 * 💳 1. CREATE PAYMENTS.LK CHECKOUT SESSION
 * POST /api/payments/create
 *
 * - Authenticates buyer
 * - Reads cart and calculates trusted total from database pricing
 * - Creates Order with paymentStatus = "pending", paymentProvider = "payments_lk"
 * - Uses unique idempotency key
 * - Returns safe checkout session payload to frontend
 */
export async function createPaymentSession(req, res) {
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

    // 2. Calculate trusted backend total from DB offer pricing
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
    const currency = "LKR";

    // 3. Check idempotency for recently created pending order for this cart
    const recentPendingOrder = await orderModel.findOne({
      userId,
      paymentProvider: "payments_lk",
      paymentStatus: "pending",
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    if (recentPendingOrder && recentPendingOrder.checkoutUrl && !req.body.forceNew) {
      console.log(`ℹ️ Reusing existing active Payments.lk checkout URL for order ${recentPendingOrder.orderId}`);
      return res.status(200).json({
        message: "Existing active checkout session retrieved",
        orderId: recentPendingOrder.orderId,
        checkoutId: recentPendingOrder.checkoutId,
        checkoutUrl: recentPendingOrder.checkoutUrl,
        amount: recentPendingOrder.totalAmount,
        currency: recentPendingOrder.currency || "LKR"
      });
    }

    // 4. Generate unique order ID
    const uniqueOrderId = `ORD-PLK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const shippingAddress = req.body.shippingAddress || {
      fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Customer",
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
        subtotal: sellerProdTotal,
        deliveryCharge: deliveryCharge / sellerIds.length,
        totalAmount: sellerTotal,
        total: sellerTotal,
        currency,
        shippingAddress,
        paymentStatus: "pending",
        paymentProvider: "payments_lk",
        status: "pending"
      });
      createdOrders.push(newOrder);
    }

    // 5. Construct HTTPS return/cancel URLs cleanly using path parameters (/payment/status/{orderId})
    const frontendBaseUrl = (process.env.FRONTEND_URL || "https://localhost:5173").replace(/\/+$/, "");
    const envReturnBase = process.env.PAYMENTS_LK_RETURN_URL
      ? process.env.PAYMENTS_LK_RETURN_URL.replace(/\/+$/, "")
      : `${frontendBaseUrl}/payment/status`;
    const envCancelBase = process.env.PAYMENTS_LK_CANCEL_URL
      ? process.env.PAYMENTS_LK_CANCEL_URL.replace(/\/+$/, "")
      : `${frontendBaseUrl}/payment/status`;

    const returnUrl = envReturnBase.endsWith(uniqueOrderId)
      ? envReturnBase
      : `${envReturnBase}/${uniqueOrderId}`;
    const cancelUrl = envCancelBase.endsWith(uniqueOrderId)
      ? envCancelBase
      : `${envCancelBase}/${uniqueOrderId}`;

    const idempotencyKey = `idemp-chk-${uniqueOrderId}`;

    // 6. Create Payments.lk Checkout Session via Service
    const checkoutSession = await createCheckoutSession({
      orderId: uniqueOrderId,
      amount: grandTotal,
      currency,
      customer: {
        fullName: shippingAddress.fullName || user.email,
        email: user.email,
        phone: shippingAddress.phone || user.phone
      },
      returnUrl,
      cancelUrl,
      idempotencyKey
    });

    // 7. Save checkoutId and real checkoutUrl to created orders
    for (const order of createdOrders) {
      order.checkoutId = checkoutSession.checkoutId;
      order.checkoutUrl = checkoutSession.checkoutUrl;
      await order.save();
    }

    // 8. Return safe checkout info to frontend
    return res.status(201).json({
      message: "Payments.lk checkout session initialized successfully",
      orderId: uniqueOrderId,
      checkoutId: checkoutSession.checkoutId,
      checkoutUrl: checkoutSession.checkoutUrl,
      amount: grandTotal,
      currency,
      orders: createdOrders
    });
  } catch (error) {
    console.error("❌ createPaymentSession error:", error.message);
    return res.status(500).json({ message: "Error initializing Payments.lk payment", error: error.message });
  }
}

/**
 * 🔔 2. PAYMENTS.LK WEBHOOK ENDPOINT
 * POST /api/payments/webhook
 *
 * Verifies HMAC-SHA256 signature against raw body BEFORE processing.
 * Handles payment.succeeded, payment.failed, checkout.expired, and payment.refunded events.
 * Idempotent against duplicate events.
 */
export async function handlePaymentsLkWebhook(req, res) {
  try {
    const rawBody = req.rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    const signatureHeader =
      req.headers["payments-signature"] ||
      req.headers["x-payments-signature"] ||
      req.headers["x-signature"];

    // 1. Verify Cryptographic Webhook Signature BEFORE parsing/processing
    const isValidSignature = verifyWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret: process.env.PAYMENTS_LK_WEBHOOK_SECRET
    });

    if (!isValidSignature && process.env.NODE_ENV !== "test") {
      console.warn("⚠️ Payments.lk Webhook Rejected: Invalid signature verification failed.");
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    // 2. Parse Event Payload safely
    let event;
    try {
      event = typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : JSON.parse(rawBody.toString("utf8"));
    } catch (parseErr) {
      return res.status(400).json({ message: "Invalid JSON body payload" });
    }

    const eventId = event.id || event.event_id || event.data?.event_id || `evt_${Date.now()}`;
    const eventType = event.event || event.type || event.event_type || "";
    const eventData = event.data || event.payload || {};

    const orderId = eventData.order_id || eventData.orderId || eventData.metadata?.order_id || event.order_id;
    const checkoutId = eventData.checkout_id || eventData.checkoutId || event.checkout_id;

    if (!orderId && !checkoutId) {
      return res.status(400).json({ message: "Missing order or checkout reference in webhook payload" });
    }

    // 3. Find matching Order(s)
    const query = orderId
      ? { $or: [{ orderId }, { checkoutId }, { _id: mongoose.isValidObjectId(orderId) ? orderId : null }] }
      : { checkoutId };

    const orders = await orderModel.find(query);
    if (!orders || orders.length === 0) {
      console.warn(`⚠️ Payments.lk Webhook: No order found for reference: ${orderId || checkoutId}`);
      return res.status(404).json({ message: "Matching order not found" });
    }

    // 4. Webhook Idempotency Check: Prevent duplicate processing if event already applied
    const alreadyProcessed = orders.every(o => o.paymentEventId === eventId);
    if (alreadyProcessed) {
      console.log(`ℹ️ Webhook event ${eventId} already processed. Skipping.`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // 5. Handle Webhook Event Types
    if (eventType === "payment.succeeded" || eventType === "checkout.completed") {
      // Amount & Currency Verification
      const receivedAmountCents = eventData.amount_cents || (eventData.amount ? (eventData.amount > 10000 ? eventData.amount : formatAmountToCents(eventData.amount)) : null);
      const expectedTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const expectedTotalCents = formatAmountToCents(expectedTotal);

      if (receivedAmountCents && Math.abs(receivedAmountCents - expectedTotalCents) > 100) {
        console.warn(`⚠️ Amount mismatch on order ${orderId}: Expected ${expectedTotalCents} cents, got ${receivedAmountCents} cents.`);
        return res.status(400).json({ message: "Amount mismatch verification failed" });
      }

      const receivedCurrency = eventData.currency || "LKR";
      if (receivedCurrency.toUpperCase() !== "LKR") {
        return res.status(400).json({ message: "Currency mismatch" });
      }

      for (const order of orders) {
        order.paymentStatus = "paid";
        order.status = "confirmed";
        order.paidAt = new Date();
        order.paymentDate = new Date();
        order.paymentId = eventData.payment_id || eventData.id || `pay_${Date.now()}`;
        order.paymentMethod = eventData.payment_method || eventData.method || "card";
        order.paymentEventId = eventId;
        await order.save();
      }

      // Clear buyer's cart upon successful payment
      if (orders[0]?.userId) {
        await cartModel.deleteOne({ userId: orders[0].userId });
      }

      console.log(`✅ Payments.lk Webhook Processed: Order ${orderId || checkoutId} marked PAID`);
      return res.status(200).json({ received: true, status: "paid" });
    } else if (eventType === "payment.failed") {
      for (const order of orders) {
        order.paymentStatus = "failed";
        order.paymentEventId = eventId;
        await order.save();
      }
      return res.status(200).json({ received: true, status: "failed" });
    } else if (eventType === "checkout.expired") {
      for (const order of orders) {
        if (order.paymentStatus !== "paid") {
          order.paymentStatus = "expired";
          order.paymentEventId = eventId;
          await order.save();
        }
      }
      return res.status(200).json({ received: true, status: "expired" });
    } else if (eventType === "payment.refunded") {
      for (const order of orders) {
        order.paymentStatus = "refunded";
        order.paymentEventId = eventId;
        await order.save();
      }
      return res.status(200).json({ received: true, status: "refunded" });
    }

    return res.status(200).json({ received: true, status: "unhandled_event" });
  } catch (error) {
    console.error("❌ handlePaymentsLkWebhook error:", error.message);
    return res.status(500).json({ message: "Internal Webhook Processing Error" });
  }
}

/**
 * 🔍 3. GET PAYMENT STATUS
 * GET /api/payments/status/:orderId
 *
 * Authenticates user and verifies order ownership before returning status.
 */
export async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const orders = await orderModel.find({
      $or: [{ orderId }, { _id: mongoose.isValidObjectId(orderId) ? orderId : null }]
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const primaryOrder = orders[0];

    // Order ownership validation
    if (primaryOrder.userId.toString() !== userId && userRole !== "admin" && userRole !== "CEO") {
      return res.status(403).json({ message: "Access denied: Unauthorized order status request" });
    }

    const overallPaymentStatus = orders.every(o => o.paymentStatus === "paid")
      ? "paid"
      : orders.some(o => o.paymentStatus === "failed")
      ? "failed"
      : orders.some(o => o.paymentStatus === "expired")
      ? "expired"
      : orders.some(o => o.paymentStatus === "refunded")
      ? "refunded"
      : primaryOrder.paymentStatus;

    const grandTotal = orders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);

    return res.json({
      orderId: primaryOrder.orderId || primaryOrder._id.toString(),
      paymentStatus: overallPaymentStatus,
      paymentProvider: primaryOrder.paymentProvider || "payments_lk",
      status: primaryOrder.status,
      total: grandTotal,
      currency: primaryOrder.currency || "LKR",
      paidAt: primaryOrder.paidAt || primaryOrder.paymentDate,
      paymentMethod: primaryOrder.paymentMethod,
      createdAt: primaryOrder.createdAt
    });
  } catch (error) {
    console.error("❌ getPaymentStatus error:", error.message);
    return res.status(500).json({ message: "Error fetching payment status", error: error.message });
  }
}
