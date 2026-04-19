const DEFAULT_BOOKKEEPING_API_BASE_URL = "http://localhost:4020";
const DEFAULT_EVENT_SOURCE = "ecommerce-backend";
const DEFAULT_ORDER_CURRENCY = "LKR";
const DEFAULT_LKR_TO_USD_RATE = 1 / 300;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [250, 750];

const wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const getBookkeepingApiBaseUrl = () =>
  (process.env.BOOKKEEPING_API_BASE_URL || DEFAULT_BOOKKEEPING_API_BASE_URL).replace(/\/+$/, "");

const getEventSource = () => process.env.BOOKKEEPING_EVENT_SOURCE || DEFAULT_EVENT_SOURCE;
const getOrderCurrency = () => (process.env.BOOKKEEPING_ORDER_CURRENCY || DEFAULT_ORDER_CURRENCY).toUpperCase();

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

const getOrderToUsdRate = (orderCurrency) => {
  if (orderCurrency === "USD") {
    return 1;
  }

  const configuredRate = toPositiveNumber(process.env.BOOKKEEPING_ORDER_TO_USD_RATE, null);
  if (configuredRate) {
    return configuredRate;
  }

  if (orderCurrency === "LKR") {
    return DEFAULT_LKR_TO_USD_RATE;
  }

  throw new Error(
    `Missing FX rate: set BOOKKEEPING_ORDER_TO_USD_RATE for order currency ${orderCurrency}`
  );
};

const roundAmount = (value) => Math.round(value * 100) / 100;

const convertOrderAmountToUsd = (orderAmount) => {
  const originalAmount = Number(orderAmount || 0);
  if (!Number.isFinite(originalAmount) || originalAmount < 0) {
    throw new Error(`Invalid order total amount for bookkeeping conversion: ${orderAmount}`);
  }

  const orderCurrency = getOrderCurrency();
  const rateToUsd = getOrderToUsdRate(orderCurrency);
  const amountUsd = roundAmount(originalAmount * rateToUsd);

  return {
    originalAmount,
    orderCurrency,
    rateToUsd,
    amountUsd
  };
};

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data?.message || `Bookkeeping request failed with status ${response.status}`;
  } catch {
    return `Bookkeeping request failed with status ${response.status}`;
  }
};

export const buildOrderPaidEvent = (order) => {
  if (!order?._id) {
    throw new Error("Order ID is required to build bookkeeping event");
  }

  const orderId = order._id.toString();
  const convertedAmount = convertOrderAmountToUsd(order.totalAmount);

  return {
    eventId: `order-paid:${orderId}`,
    type: "ORDER_PAID",
    timestamp: new Date(order.createdAt || Date.now()).toISOString(),
    source: getEventSource(),
    payload: {
      orderId,
      amount: convertedAmount.amountUsd,
      sourceDocumentType: "SALES_ORDER",
      sourceDocumentId: orderId,
      metadata: {
        originalAmount: convertedAmount.originalAmount,
        originalCurrency: convertedAmount.orderCurrency,
        fxRateToUsd: convertedAmount.rateToUsd
      }
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

export const postOrderPaidEventWithRetry = async (order, maxAttempts = MAX_RETRY_ATTEMPTS) => {
  const payload = buildOrderPaidEvent(order);
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

