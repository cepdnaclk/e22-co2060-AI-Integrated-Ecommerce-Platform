import {
  generateCheckoutHash,
  verifyNotificationSignature,
  mapStatusCodeToPaymentStatus,
  formatAmount
} from "../services/payhereService.js";
import crypto from "crypto";

/**
 * ======================================================
 * PAYHERE SERVICE UNIT TESTS
 * ======================================================
 */
function runTests() {
  console.log("=========================================");
  console.log("🧪 Running PayHere Payment Service Tests");
  console.log("=========================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test formatAmount
  console.log("\n1. Testing formatAmount...");
  assert(formatAmount(1000) === "1000.00", "Formats integer 1000 to '1000.00'");
  assert(formatAmount("99.9") === "99.90", "Formats string '99.9' to '99.90'");
  assert(formatAmount(0) === "0.00", "Formats 0 to '0.00'");

  // 2. Test generateCheckoutHash formula
  console.log("\n2. Testing PayHere Checkout Hash Generation...");
  const merchantId = "1234567";
  const orderId = "ORD-TEST-001";
  const amount = 1500;
  const currency = "LKR";
  const merchantSecret = "4XXXXXXXXXXXX";

  // Expected MD5 formula:
  // secret_md5 = md5("4XXXXXXXXXXXX").toUpperCase()
  // hash = md5(merchantId + orderId + "1500.00" + currency + secret_md5).toUpperCase()
  const expectedSecretMd5 = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
  const expectedHash = crypto.createHash("md5")
    .update(`${merchantId}${orderId}1500.00${currency}${expectedSecretMd5}`)
    .digest("hex")
    .toUpperCase();

  const generatedHash = generateCheckoutHash({
    merchantId,
    orderId,
    amount,
    currency,
    merchantSecret
  });

  assert(generatedHash === expectedHash, "Checkout hash matches official PayHere MD5 algorithm");
  assert(generatedHash === generatedHash.toUpperCase(), "Checkout hash is uppercase");

  // 3. Test verifyNotificationSignature (Valid Signature)
  console.log("\n3. Testing Valid Notification Checksum Verification...");
  const statusCode = 2; // Paid
  const validNotifyMd5 = crypto.createHash("md5")
    .update(`${merchantId}${orderId}1500.00${currency}${statusCode}${expectedSecretMd5}`)
    .digest("hex")
    .toUpperCase();

  const isValidNotify = verifyNotificationSignature({
    merchantId,
    orderId,
    payhereAmount: 1500,
    payhereCurrency: currency,
    statusCode,
    md5sig: validNotifyMd5,
    merchantSecret
  });

  assert(isValidNotify === true, "Valid notification signature verified successfully");

  // 4. Test verifyNotificationSignature (Invalid Checksum)
  console.log("\n4. Testing Invalid Notification Checksum Rejection...");
  const isInvalidNotify = verifyNotificationSignature({
    merchantId,
    orderId,
    payhereAmount: 1500,
    payhereCurrency: currency,
    statusCode,
    md5sig: "INVALID_CHECKSUM_HASH",
    merchantSecret
  });

  assert(isInvalidNotify === false, "Invalid checksum correctly rejected");

  // 5. Test status_code mappings
  console.log("\n5. Testing PayHere Status Code Mappings...");
  assert(mapStatusCodeToPaymentStatus(2) === "paid", "status_code 2 maps to 'paid'");
  assert(mapStatusCodeToPaymentStatus("2") === "paid", "status_code '2' (string) maps to 'paid'");
  assert(mapStatusCodeToPaymentStatus(0) === "pending", "status_code 0 maps to 'pending'");
  assert(mapStatusCodeToPaymentStatus(-1) === "cancelled", "status_code -1 maps to 'cancelled'");
  assert(mapStatusCodeToPaymentStatus(-2) === "failed", "status_code -2 maps to 'failed'");
  assert(mapStatusCodeToPaymentStatus(-3) === "chargedback", "status_code -3 maps to 'chargedback'");
  assert(mapStatusCodeToPaymentStatus(999) === "failed", "Unknown status_code defaults to 'failed'");

  console.log("\n=========================================");
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
