import nodemailer from "nodemailer";
import { createAuditLog } from "./auditService.js";

export async function emitDeliveryNotification({
  type,
  channel = "in_app",
  recipients = [],
  payload = {},
  actor = {},
  context = {},
  req = null,
}) {
  return createAuditLog({
    category: "notification",
    action: `notification.${type || "unknown"}`,
    severity: "info",
    actor,
    context,
    metadata: {
      channel,
      recipients,
      payload,
    },
    req,
  });
}

const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendDeliveryOtpEmail({
  email,
  customerName = "Customer",
  trackingNumber,
  otp,
  expiresAt,
}) {
  if (!email) {
    throw new Error("Customer email is missing");
  }

  const expiryText = new Date(expiresAt).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
  });

  await emailTransporter.sendMail({
    from: `"BEETA" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "BEETA Delivery Verification OTP",
    text: [
      `Hello ${customerName},`,
      "",
      `Your BEETA delivery verification OTP is: ${otp}`,
      "",
      `Tracking Number: ${trackingNumber}`,
      `OTP expires at: ${expiryText}`,
      "",
      "Please provide this OTP to the courier when your order is delivered.",
      "",
      "Do not share this OTP with anyone other than the courier delivering your order.",
      "",
      "BEETA",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>BEETA Delivery Verification</h2>

        <p>Hello ${customerName},</p>

        <p>Your delivery verification OTP is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 15px;
          text-align: center;
          background: #f3f4f6;
          border-radius: 8px;
          margin: 20px 0;
        ">
          ${otp}
        </div>

        <p>
          <strong>Tracking Number:</strong> ${trackingNumber}
        </p>

        <p>
          <strong>Expires:</strong> ${expiryText}
        </p>

        <p>
          Please provide this OTP to the courier when your order is delivered.
        </p>

        <p>
          <strong>Do not share this OTP with anyone other than the courier
          delivering your order.</strong>
        </p>

        <hr />

        <p>BEETA E-commerce Platform</p>
      </div>
    `,
  });

  return {
    success: true,
    channel: "email",
    recipient: email,
  };
}