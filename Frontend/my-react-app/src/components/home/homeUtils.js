// src/components/home/homeUtils.js
// ──────────────────────────────────────────────────────────────────────────────
// Shared utilities for all home section components
// ──────────────────────────────────────────────────────────────────────────────

import API_BASE_URL from "../../config/api";

/**
 * Category → curated Unsplash image that always loads.
 * These are real, stable image URLs that never show as black boxes.
 */
const CATEGORY_IMAGES = {
  electronics:  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  fashion:      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80",
  gaming:       "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
  books:        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&q=80",
  beauty:       "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80",
  sports:       "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
  furniture:    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
  home:         "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&q=80",
  kitchen:      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
  accessories:  "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=80",
  pets:         "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80",
  toys:         "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  others:       "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&q=80",
};

const BRAND_IMAGES = {
  apple:    "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
  samsung:  "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&q=80",
  sony:     "https://images.unsplash.com/photo-1595433707802-76c4e0f77b41?w=600&q=80",
  dell:     "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80",
  hp:       "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
  asus:     "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&q=80",
  nike:     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  adidas:   "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80",
};

const FALLBACK_PRODUCT = "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80";

/**
 * Returns a working product image URL.
 * Priority: offer.image → product.image → category-based → generic fallback
 */
export function resolveProductImage(product, offer) {
  const raw = offer?.image || product?.image || product?.img || "";
  // If it looks like a real http/https URL, use it directly
  if (raw && (raw.startsWith("http://") || raw.startsWith("https://"))) return raw;
  // If it's a non-empty relative path, prefix with API_BASE_URL
  if (raw && raw.length > 1 && raw !== "/images/default-product.png") {
    return `${API_BASE_URL}${raw}`;
  }
  // Category-based fallback
  const cat = (product?.category || "").toLowerCase();
  return CATEGORY_IMAGES[cat] || FALLBACK_PRODUCT;
}

/** Return an Unsplash image for a brand name */
export function resolveBrandImage(brandName) {
  const key = (brandName || "").toLowerCase();
  return BRAND_IMAGES[key] || FALLBACK_PRODUCT;
}

/** Return an Unsplash image for a category name */
export function resolveCategoryImage(categoryName) {
  const key = (categoryName || "").toLowerCase();
  return CATEGORY_IMAGES[key] || FALLBACK_PRODUCT;
}

/** Fetch wrapper that always returns a safe value */
export async function safeFetch(url, defaultValue = []) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("❌ safeFetch failed:", url, e.message);
    return defaultValue;
  }
}

export { API_BASE_URL };
