import crypto from "crypto";

/**
 * ======================================================
 * PAYHERE PAYMENT SERVICE
 * ======================================================
 * Handles PayHere hash generation, signature verification,
 * amount formatting, and status code mapping.
 *
 * Rules:
 * - Never expose PAYHERE_MERCHANT_SECRET to frontend
 * - Format amounts strictly to 2 decimal places (e.g. "1000.00")
 * - Use official PayHere Checkout API MD5 hash algorithms
 * ======================================================
 */

/**
 * Formats numeric amount to 2 decimal places required by PayHere (e.g. 1000 -> "1000.00")
 * @param {number|string} amount
 * @returns {string}
 */
export function formatAmount(amount) {
  const num = Number(amount) || 0;
  return num.toFixed(2);
}

/**
 * Generate official PayHere Checkout API hash
 * Formula: md5(merchant_id + order_id + formatted_amount + currency + uppercase(md5(merchant_secret)))
 *
 * @param {Object} params
 * @param {string} params.merchantId
 * @param {string} params.orderId
 * @param {number|string} params.amount
 * @param {string} [params.currency="LKR"]
 * @param {string} params.merchantSecret
 * @returns {string} Uppercase final MD5 hash
 */
export function generateCheckoutHash({ merchantId, orderId, amount, currency = "LKR", merchantSecret }) {
  if (!merchantId || !orderId || amount === undefined || !merchantSecret) {
    throw new Error("Missing required parameters for PayHere checkout hash generation.");
  }

  const formattedAmt = formatAmount(amount);
  const secretMd5Upper = crypto
    .createHash("md5")
    .update(merchantSecret)
    .digest("hex")
    .toUpperCase();

  const rawString = `${merchantId}${orderId}${formattedAmt}${currency}${secretMd5Upper}`;
  return crypto
    .createHash("md5")
    .update(rawString)
    .digest("hex")
    .toUpperCase();
}

/**
 * Verify PayHere Notify Callback Signature (md5sig)
 * Formula: md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + uppercase(md5(merchant_secret)))
 *
 * @param {Object} params
 * @param {string} params.merchantId
 * @param {string} params.orderId
 * @param {number|string} params.payhereAmount
 * @param {string} params.payhereCurrency
 * @param {number|string} params.statusCode
 * @param {string} params.md5sig
 * @param {string} params.merchantSecret
 * @returns {boolean} True if checksum matches
 */
export function verifyNotificationSignature({
  merchantId,
  orderId,
  payhereAmount,
  payhereCurrency,
  statusCode,
  md5sig,
  merchantSecret
}) {
  if (!merchantId || !orderId || payhereAmount === undefined || !payhereCurrency || statusCode === undefined || !md5sig || !merchantSecret) {
    return false;
  }

  const formattedAmt = formatAmount(payhereAmount);
  const secretMd5Upper = crypto
    .createHash("md5")
    .update(merchantSecret)
    .digest("hex")
    .toUpperCase();

  const rawString = `${merchantId}${orderId}${formattedAmt}${payhereCurrency}${statusCode}${secretMd5Upper}`;
  const calculatedHash = crypto
    .createHash("md5")
    .update(rawString)
    .digest("hex")
    .toUpperCase();

  return calculatedHash === String(md5sig).toUpperCase();
}

/**
 * Maps PayHere status_code to application paymentStatus
 * @param {number|string} statusCode
 * @returns {string}
 */
export function mapStatusCodeToPaymentStatus(statusCode) {
  const code = Number(statusCode);
  switch (code) {
    case 2:
      return "paid";
    case 0:
      return "pending";
    case -1:
      return "cancelled";
    case -2:
      return "failed";
    case -3:
      return "chargedback";
    default:
      return "failed";
  }
}
