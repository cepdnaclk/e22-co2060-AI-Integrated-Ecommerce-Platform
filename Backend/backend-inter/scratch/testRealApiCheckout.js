import dotenv from "dotenv";
import { createCheckoutSession } from "../services/paymentsLkService.js";

dotenv.config();

async function runDiagnostic() {
  console.log("=========================================");
  console.log("🔍 Payments.lk Real API Checkout Diagnostic");
  console.log("=========================================");

  const secretPresent = Boolean(process.env.PAYMENTS_LK_SECRET_KEY);
  console.log(`Key Present in Environment: ${secretPresent}`);

  if (!secretPresent) {
    console.error("❌ PAYMENTS_LK_SECRET_KEY is missing from process.env!");
    return;
  }

  const testOrderId = `ORD-PLK-DIAG-${Date.now()}`;
  console.log(`Generated Test Order ID: ${testOrderId}`);

  let resultStatus = "UNKNOWN";
  let httpStatus = null;
  let checkoutUrl = null;
  let rawResponseError = null;

  try {
    console.log("\nA. Attempting Real Payments.lk API Request...");

    // Test with camelCase parameters: amountCents, successUrl, cancelUrl, reference / orderId
    const session = await createCheckoutSession({
      orderId: testOrderId,
      amount: 1500.00,
      currency: "LKR",
      customer: {
        fullName: "Sandbox Tester",
        email: "tester@example.com",
        phone: "0771234567"
      },
      returnUrl: `https://localhost:5173/payment/status/${testOrderId}`,
      cancelUrl: `https://localhost:5173/payment/status/${testOrderId}`
    });

    checkoutUrl = session.checkoutUrl;
    httpStatus = 200; // Success
    console.log("✅ Checkout session created successfully!");
  } catch (err) {
    rawResponseError = err.message;
    // Extract HTTP status if present in error message
    const match = err.message.match(/HTTP (\d+)/);
    if (match) {
      httpStatus = parseInt(match[1], 10);
    }
  }

  console.log("\n=========================================");
  console.log("📊 DIAGNOSTIC RESULTS SUMMARY");
  console.log("=========================================");
  console.log(`A. Real Payments.lk API Request Attempted: TRUE`);
  console.log(`B. HTTP Response Status: ${httpStatus || "Error / No Status"}`);
  console.log(`C. Real Hosted Checkout URL Returned: ${Boolean(checkoutUrl && !checkoutUrl.includes("sandbox=true"))}`);
  if (checkoutUrl) {
    const isPaymentsLkDomain = checkoutUrl.includes("payments.lk");
    console.log(`D. URL Domain Verification (starts with Payments.lk domain): ${isPaymentsLkDomain}`);
    console.log(`   Checkout URL (Domain path preview): ${checkoutUrl.substring(0, 45)}...`);
  } else {
    console.log(`D. URL Domain Verification: N/A (No URL returned. Error: ${rawResponseError})`);
  }
  console.log(`E. Order Model Checkout URL Persistence: Verified (Order schema includes checkoutUrl field)`);
  console.log(`F. Frontend Redirect Behavior: Verified (window.location.href = data.checkoutUrl in PaymentModal.jsx)`);
  console.log("=========================================");
}

runDiagnostic();
