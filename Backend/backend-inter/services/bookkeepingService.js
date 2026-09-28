const DEFAULT_BOOKKEEPING_API_BASE_URL = "http://localhost:4020";
const DEFAULT_EVENT_SOURCE = "ecommerce-backend";
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [250, 750];

const wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const getBookkeepingApiBaseUrl = () =>
  (process.env.BOOKKEEPING_API_BASE_URL || DEFAULT_BOOKKEEPING_API_BASE_URL).replace(/\/+$/, "");

const getEventSource = () => process.env.BOOKKEEPING_EVENT_SOURCE || DEFAULT_EVENT_SOURCE;

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data?.message || `Bookkeeping request failed with status ${response.status}`;
  } catch {
    return `Bookkeeping request failed with status ${response.status}`;
  }
};

export const buildMarketplacePaymentEvent = (order, payherePaymentId) => {
  if (!order?._id) {
    throw new Error("Order ID is required to build bookkeeping event");
  }

  const orderId = order._id.toString();
  
  // Use payment ID or order ID for idempotency to ensure one event per order payment
  const idempotencyId = payherePaymentId ? `marketplace-payment:${payherePaymentId}:${orderId}` : `marketplace-payment:${orderId}`;

  return {
    eventId: idempotencyId,
    type: "MARKETPLACE_PAYMENT",
    timestamp: new Date(order.paymentDate || Date.now()).toISOString(),
    source: getEventSource(),
    payload: {
      orderId,
      paymentId: payherePaymentId || null,
      sourceDocumentType: "PAYHERE_CHECKOUT",
      sourceDocumentId: orderId,
      sellerId: order.sellerId.toString(),
      currency: order.currency || "LKR",
      marketplaceGross: order.totalAmount, // customer paid total
      commissionAmount: order.commissionAmount || 0,
      sellerPayableAmount: order.sellerPayableAmount || 0,
      deliveryCharge: order.deliveryCharge || 0
    }
  };
};

export const postBookkeepingEvent = async (eventPayload) => {
  const baseUrl = getBookkeepingApiBaseUrl();
  const response = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventPayload)
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json();
};

export const postMarketplacePaymentEventWithRetry = async (order, payherePaymentId, maxAttempts = MAX_RETRY_ATTEMPTS) => {
  const payload = buildMarketplacePaymentEvent(order, payherePaymentId);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await postBookkeepingEvent(payload);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await wait(delayMs);
    }
  }

  throw lastError;
};

export const buildSellerPayoutEvent = (settlement) => {
  if (!settlement?._id) {
    throw new Error("Settlement ID is required to build bookkeeping event");
  }

  const settlementId = settlement._id.toString();
  const idempotencyId = `seller-payout:${settlementId}`;
  
  // Use reconciliation.receivedAmount if reconciled, else expectedAmount, else codAmount
  const payoutAmount = settlement.reconciliation.receivedAmount > 0 
    ? settlement.reconciliation.receivedAmount 
    : (settlement.reconciliation.expectedAmount || settlement.codAmount || 0);

  return {
    eventId: idempotencyId,
    type: "SELLER_PAYOUT",
    timestamp: new Date().toISOString(),
    source: getEventSource(),
    payload: {
      settlementId,
      orderId: settlement.deliveryOrderId.toString(),
      sourceDocumentType: "BANK_STATEMENT",
      sourceDocumentId: settlementId,
      sellerId: settlement.sellerId.toString(),
      currency: "LKR",
      payoutAmount: payoutAmount
    }
  };
};

export const postSellerPayoutEventWithRetry = async (settlement, maxAttempts = MAX_RETRY_ATTEMPTS) => {
  const payload = buildSellerPayoutEvent(settlement);
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await postBookkeepingEvent(payload);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await wait(delayMs);
    }
  }

  throw lastError;
};

