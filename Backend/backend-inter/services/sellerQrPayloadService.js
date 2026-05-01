export const SELLER_QR_FORMAT_VERSION = "SELLER_ORDER_QR_V4";

function normalizeText(value, fallback = "N/A") {
  const text = String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function normalizeOptionalText(value) {
  const text = String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function compactToken(value, { fallback = "NA", maxLength = 40 } = {}) {
  const text = normalizeOptionalText(value)
    .replace(/[|:]/g, "-");

  if (!text) {
    return fallback;
  }

  return text.slice(0, maxLength);
}

function buildAddressText(shipping = {}) {
  const directFormatted = normalizeOptionalText(shipping.formattedAddress);
  if (directFormatted) {
    return directFormatted;
  }

  const pieces = [
    shipping.street,
    shipping.city,
    shipping.state,
    shipping.postalCode,
    shipping.country
  ]
    .map((piece) => normalizeOptionalText(piece))
    .filter(Boolean);

  return pieces.length > 0 ? pieces.join(", ") : "N/A";
}

function extractLegacyFields(payload = {}) {
  return {
    orderId: payload.orderId || payload.order?.orderId,
    sellerId: payload.sellerId || payload.seller?.sellerId,
    shopName: payload.shopName || payload.seller?.shopName,
    productName: payload.productName || payload.packedProduct?.productName,
    skuOrImei: payload.skuOrImei || payload.packedProduct?.skuOrImei,
    customerName: payload.customerName || payload.customer?.fullName,
    customerPhone: payload.customerPhone || payload.customer?.phone,
    address: payload.address || payload.shippingAddress?.formattedAddress,
    lat: payload.lat ?? payload.location?.lat,
    lng: payload.lng ?? payload.location?.lng,
    totalAmount: payload.totalAmount ?? payload.order?.totalAmount,
    generatedAt: payload.generatedAt
  };
}

export function buildSellerQrText(payload = {}) {
  const legacy = extractLegacyFields(payload);
  const orderId = compactToken(legacy.orderId, { maxLength: 36 });
  return `SOQR4:${orderId}`;
}

export function parseSellerQrOrderId(rawQrText = "") {
  const qrText = String(rawQrText ?? "").trim();
  if (!qrText) {
    return null;
  }

  const soqr4 = qrText.match(/^SOQR4:([a-fA-F0-9]{24})$/);
  if (soqr4) {
    return soqr4[1];
  }

  const soqr3 = qrText.match(/(?:^|\|)O:([a-fA-F0-9]{24})(?:\||$)/);
  if (soqr3) {
    return soqr3[1];
  }

  const legacyKv = qrText.match(/(?:^|\n)ORDER_ID=([a-fA-F0-9]{24})(?:\n|$)/);
  if (legacyKv) {
    return legacyKv[1];
  }

  if (/^[a-fA-F0-9]{24}$/.test(qrText)) {
    return qrText;
  }

  return null;
}

export function isLatestSellerQrPayload(payload) {
  return (
    payload &&
    payload.formatVersion === SELLER_QR_FORMAT_VERSION &&
    typeof payload.qrText === "string" &&
    payload.qrText.trim().length > 0
  );
}

export function buildSellerQrPayload(order) {
  const shipping = order.shippingAddress || {};
  const user = order.userId || {};
  const seller = order.sellerId || {};

  const fullNameFromUser = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const customerName = normalizeText(shipping.fullName || fullNameFromUser);
  const generatedAt = new Date().toISOString();
  const addressText = buildAddressText(shipping);

  const payload = {
    formatVersion: SELLER_QR_FORMAT_VERSION,
    qrType: "seller-order-fulfillment",
    generatedAt,
    order: {
      orderId: order._id?.toString(),
      status: order.status,
      totalAmount: Number(order.totalAmount || 0),
      createdAt: order.createdAt
    },
    seller: {
      sellerId: seller._id?.toString() || order.sellerId?.toString(),
      shopName: normalizeText(seller.shopName)
    },
    packedProduct: {
      productName: normalizeText(order.sellerQr?.packingProductName),
      skuOrImei: normalizeText(order.sellerQr?.packingSkuOrImei)
    },
    customer: {
      fullName: customerName,
      phone: normalizeText(shipping.phone || user.phone)
    },
    shippingAddress: {
      formattedAddress: addressText
    },
    location: {
      lat: Number.isFinite(Number(shipping.lat)) ? Number(shipping.lat) : null,
      lng: Number.isFinite(Number(shipping.lng)) ? Number(shipping.lng) : null
    }
  };

  payload.qrText = buildSellerQrText(payload);
  return payload;
}
