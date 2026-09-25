import express from "express";
import crypto from "crypto";
import Order from "../../models/order.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ======================================================
 * DMS (Delivery Management System) Mock/Partial Router
 * ======================================================
 * This file contains the implementation for the Customer Delivery OTP feature.
 * Because the full DMS router was missing in this repository copy, we initialize
 * an express router and implement the endpoints requested by the frontend.
 */

// Helper to simulate sending a notification (since no SMS/Email service exists in the repo)
function sendCustomerNotification(email, phone, message) {
  console.log(`\n======================================================`);
  console.log(`📩 [NOTIFICATION SENT]`);
  console.log(`To: ${email} | ${phone}`);
  console.log(`Message: ${message}`);
  console.log(`======================================================\n`);
}

/**
 * 📦 SCAN SELLER/PACKAGE QR
 * POST /api/dms/shipments/scan-seller-qr
 * 
 * Body: { qrData } 
 * We assume qrData contains the order ID or similar.
 */
router.post("/shipments/scan-seller-qr", authMiddleware, async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) return res.status(400).json({ success: false, message: "QR Data is required" });

    // Try to parse the QR data to extract orderId
    let orderId;
    try {
      const payload = JSON.parse(qrData);
      orderId = payload.orderId;
    } catch (err) {
      orderId = qrData; // fallback
    }

    const order = await Order.findById(orderId).populate("userId", "email firstName lastName phone");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found for this QR code" });
    }

    // Usually, we'd update the order status to 'shipped' here if it's the first time
    if (order.status === "pending" || order.status === "confirmed") {
      order.status = "shipped";
      await order.save();
    }

    res.json({
      success: true,
      message: "Package collected successfully",
      order: {
        id: order._id,
        status: order.status,
      }
    });
  } catch (error) {
    console.error("❌ scan-seller-qr error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

/**
 * 🚚 INITIATE DELIVERY (Generate OTP)
 * POST /api/dms/shipments/track/:id/initiate-delivery
 */
router.post("/shipments/track/:id/initiate-delivery", authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate("userId", "email firstName lastName phone");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "delivered") {
      return res.status(400).json({ success: false, message: "Order is already delivered" });
    }
    
    // Check if an active OTP already exists and isn't expired
    const now = new Date();
    if (order.deliveryVerification && order.deliveryVerification.status === "pending") {
      if (order.deliveryVerification.expiresAt && order.deliveryVerification.expiresAt > now) {
        // Just resend the same OTP (in a real system we'd decrypt/use a separate resend or recreate)
        // For security, let's just generate a new one to be safe and extend the time
      }
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP for secure storage
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Expiration time: 10 minutes from now
    const expiresAt = new Date(now.getTime() + 10 * 60000);

    // Save to order
    order.deliveryVerification = {
      otpHash,
      generatedAt: now,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
      verifiedAt: null,
      status: "pending"
    };

    await order.save();

    // Send notification
    const user = order.userId;
    if (user) {
      const message = `Your order ${orderId} is out for delivery! Your delivery OTP is ${otp}. Please provide this code to the courier when receiving your package. DO NOT share this code with anyone else. It expires in 10 minutes.`;
      sendCustomerNotification(user.email, user.phone, message);
    }

    res.json({
      success: true,
      message: "Delivery initiated and OTP sent to customer",
    });
  } catch (error) {
    console.error("❌ initiate-delivery error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

/**
 * ✅ VERIFY DELIVERY OTP
 * POST /api/dms/shipments/track/:id/verify-otp
 * Body: { otp }
 */
router.post("/shipments/track/:id/verify-otp", authMiddleware, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "delivered") {
      return res.status(400).json({ success: false, message: "Order is already delivered" });
    }

    const verification = order.deliveryVerification;

    if (!verification || !verification.otpHash || verification.status !== "pending") {
      return res.status(400).json({ success: false, message: "No active delivery verification for this order" });
    }

    // Check expiration
    const now = new Date();
    if (now > verification.expiresAt) {
      verification.status = "expired";
      await order.save();
      return res.status(400).json({ success: false, message: "OTP has expired. Please initiate delivery again." });
    }

    // Check attempts limit
    if (verification.attempts >= verification.maxAttempts) {
      verification.status = "failed";
      await order.save();
      return res.status(400).json({ success: false, message: "Maximum verification attempts exceeded." });
    }

    // Increment attempts
    verification.attempts += 1;

    // Verify OTP securely
    const hashedInput = crypto.createHash("sha256").update(otp.toString()).digest("hex");
    if (hashedInput !== verification.otpHash) {
      await order.save();
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Success!
    verification.status = "verified";
    verification.verifiedAt = now;
    order.status = "delivered";

    await order.save();

    res.json({
      success: true,
      message: "Delivery verified successfully",
      deliveryStatus: order.status
    });
  } catch (error) {
    console.error("❌ verify-otp error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

// We can add dummy implementations for other routes called by the frontend if needed
router.get("/portal/me", (req, res) => {
  res.json({ dashboardRoute: "/dms/center/dashboard" });
});

router.post("/staff/register", (req, res) => {
  res.json({ success: true, message: "Staff registered" });
});

export default router;
