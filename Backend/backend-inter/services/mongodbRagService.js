import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import productModel from "../models/products.js";

/**
 * 🧠 Advanced MongoDB Atlas Vector Search RAG Service (STEP 10 Conversational RAG)
 * 
 * Implements strict multi-stage filtering & conversational contextualization:
 * 1. Conversation history normalization & follow-up query detection
 * 2. Conversational query contextualization (Gemini LLM query rewriting + 429 fallback)
 * 3. Intent & constraint extraction (Product type, brand, min/max price, stock, gaming intent)
 * 4. Vector Search retrieval via Atlas $vectorSearch using 768-dim gemini-embedding-2
 * 5. Strict product _id deduplication (preserving highest vector score)
 * 6. Product-type relevance validation & normalization
 * 7. Price & Stock constraint validation (EXACT_MATCH, ALTERNATIVE_ONLY, NO_MATCH)
 * 8. Grounded LLM answer generation with conversation history context & 429 fallback
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = "gemini-embedding-2";
const LLM_MODEL = process.env.GEMINI_LLM_MODEL || "gemini-3.6-flash";
const REQUIRED_DIMENSIONS = 768;
const VECTOR_INDEX = "vector_index";
const ATLAS_FALLBACK_URI = "mongodb+srv://admin:123better@cluster0.9v7ko7p.mongodb.net/ecommerce?retryWrites=true&w=majority";

/**
 * Product Type Normalization & Category Regex Patterns
 */
const PRODUCT_TYPE_PATTERNS = {
  laptop: /\b(laptops?|notebooks?|macbooks?|zephyrus|g14|g16|xps|thinkpads?|pcs?|computers?)\b/i,
  phone: /\b(phones?|smartphones?|mobiles?|galaxy\s+s\d+|iphones?|pixels?|galaxy\s+z|mobile\s+phones?)\b/i,
  keyboard: /\b(keyboards?|blackwidows?|mechanical\s+keyboards?)\b/i,
  mouse: /\b(mouses?|mice|trackballs?)\b/i,
  clothing: /\b(clothings?|apparel|shirts?|t-shirts?|pants?|joggers?|hoodies?|jackets?|fleece|coats?|sweaters?|nuptse|activewear|sportswear|outerwear)\b|\bwear\b(?!able)/i,
  footwear: /\b(shoes?|footwear|boots?|sneakers?|pegasus|running\s+shoes?)\b/i,
  appliance: /\b(appliances?|vacuums?|cleaning|dishwashers?|purifiers?|refrigerators?|steams?|roomba)\b/i
};

/**
 * Normalizes history array into standard [{ role: "user" | "model", text: string }] format.
 */
export function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((msg) => msg && typeof msg.text === "string" && msg.text.trim())
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      text: msg.text.trim(),
    }));
}

/**
 * Returns recent bounded history window.
 */
export function getRecentHistory(history = [], maxTurns = 6) {
  const norm = normalizeHistory(history);
  return norm.slice(-maxTurns);
}

/**
 * Detects if current query is a dependent follow-up turn referring to recent conversation history.
 */
export function detectFollowUpQuery(queryText = "", history = []) {
  if (!queryText || !Array.isArray(history) || history.length === 0) return false;
  const normalized = queryText.toLowerCase().trim();

  // Safety Rule #9: Check if current message explicitly introduces a new product category or topic change
  if (/\b(now\s+show\s+me|now\s+find|instead\s+show|switch\s+to)\b/i.test(normalized)) {
    return false;
  }

  // Check if user explicitly asked for a different product type
  const explicitProductTypes = ["phone", "smartphone", "mobile", "laptop", "notebook", "macbook", "keyboard", "mouse", "appliance", "shoes", "clothing"];
  const matchesNewType = explicitProductTypes.some(t => normalized.includes(t));
  const hasNowPrefix = /\b(now|instead|other)\b/i.test(normalized);

  if (matchesNewType && hasNowPrefix) {
    return false;
  }

  // Check if current query is a follow-up phrase
  const followupPatterns = [
    /\b(cheaper|cheapest|cheaper ones)\b/i,
    /\b(which\s+(one|item|model|phone|laptop|keyboard|appliance)|which\s+is|which\s+has)\b/i,
    /\b(what\s+about|how\s+about)\b/i,
    /\b(do\s+you\s+have\s+another|another\s+one|more\s+stock|most\s+stock)\b/i,
    /\b(is\s+it|are\s+they)\s+(available|in\s+stock|cheaper)\b/i,
    /\b(how\s+much\s+is\s+it|what('s|\s+is)\s+the\s+price)\b/i
  ];

  const isFollowup = followupPatterns.some(p => p.test(normalized));
  if (!isFollowup) return false;

  // Ensure recent history contained product search context
  const recentHist = getRecentHistory(history, 6);
  return recentHist.some(msg => {
    if (msg.role !== "user") return false;
    const txt = msg.text.toLowerCase();
    return /\b(laptops?|notebooks?|macbooks?|zephyrus|g14|g16|xps|phones?|smartphones?|mobiles?|galaxy|iphones?|pixels?|keyboards?|mouses?|mice|shoes?|footwear|appliances?|clothings?|nike|samsung|apple|asus|razer|dyson|sony|dell|bosch)\b/i.test(txt);
  });
}

/**
 * Extracts structured context from recent history turns.
 */
export function extractConversationContext(history = []) {
  const context = {
    targetProductType: null,
    targetBrand: null,
    gamingIntent: false,
    maxPriceConstraint: null,
    inStockConstraint: false
  };

  const recent = getRecentHistory(history, 6);
  for (let i = recent.length - 1; i >= 0; i--) {
    const msg = recent[i];
    if (msg.role !== "user") continue;
    const filters = extractQueryFilters(msg.text);

    if (!context.targetProductType && filters.targetProductType) {
      context.targetProductType = filters.targetProductType;
    }
    if (!context.targetBrand && filters.targetBrand) {
      context.targetBrand = filters.targetBrand;
    }
    if (!context.gamingIntent && filters.gamingIntent) {
      context.gamingIntent = true;
    }
    if (context.maxPriceConstraint === null && filters.maxPriceConstraint !== null) {
      context.maxPriceConstraint = filters.maxPriceConstraint;
    }
    if (!context.inStockConstraint && filters.inStockConstraint) {
      context.inStockConstraint = true;
    }
  }

  return context;
}

/**
 * Contextualizes user query using Gemini LLM with 429 quota / API failure protection.
 */
export async function contextualizeUserQuery(queryText = "", history = [], ai = null) {
  if (!queryText || typeof queryText !== "string") return "";
  const trimmed = queryText.trim();
  const recentHist = getRecentHistory(history, 6);

  if (recentHist.length === 0 || !detectFollowUpQuery(trimmed, recentHist)) {
    return trimmed;
  }

  const priorContext = extractConversationContext(recentHist);

  // Attempt Gemini LLM Query Contextualization
  if (ai) {
    try {
      const historyContextText = recentHist.map(m => `${m.role.toUpperCase()}: ${m.text}`).join("\n");
      const systemPrompt = `
You are a search query contextualizer for an e-commerce assistant.
Given the recent conversation history and a user follow-up query, rewrite the follow-up into a SINGLE standalone, explicit search query.

EXAMPLES:
History:
USER: Show me gaming laptops
MODEL: Here are our gaming laptops...
Follow-up: Which one is cheaper?
Rewritten Query: Which gaming laptop is cheaper?

History:
USER: Show me Samsung phones
MODEL: Here are our Samsung phones...
Follow-up: Which one is in stock?
Rewritten Query: Which Samsung phones are in stock?

History:
USER: Show me laptops under 600000
MODEL: Here are laptops under 600000...
Follow-up: Show me cheaper ones
Rewritten Query: Show me laptops cheaper than 600000 LKR

History:
USER: I need a gaming laptop
MODEL: Here are gaming laptops...
Follow-up: What about ASUS?
Rewritten Query: Show me ASUS gaming laptops

RULES:
1. Return ONLY the rewritten query text. Do NOT add quotes, prefixes, or explanations.
2. Maintain relevant product type, brand, and constraints from history.
3. If the user explicitly changes topic (e.g. from laptops to phones), DO NOT keep the old product type.

CONVERSATION HISTORY:
${historyContextText}

USER FOLLOW-UP:
${trimmed}

REWRITTEN STANDALONE QUERY:
`;

      const model = ai.getGenerativeModel({ model: LLM_MODEL });
      const res = await model.generateContent(systemPrompt);
      if (res && res.response && res.response.text) {
        const rewritten = res.response.text().trim().replace(/^["']|["']$/g, '');
        if (rewritten && rewritten.length > 3) {
          return rewritten;
        }
      }
    } catch (err) {
      console.warn(`[Query Contextualization Fallback]: ${err.message.split('\n')[0]}`);
    }
  }

  // Deterministic Fallback Contextualization (if LLM unavailable or 429)
  const cleanFollowupText = trimmed
    .replace(/\b(which\s+(one|item|model|phone|laptop|keyboard|appliance)|which\s+is|which\s+has)\b/gi, "")
    .replace(/\b(show\s+me|tell\s+me|what\s+about|how\s+about|do\s+you\s+have|can\s+i\s+get|is\s+it|are\s+they|how\s+much\s+is\s+it)\b/gi, "")
    .replace(/\b(cheaper|cheapest|cheaper\s+ones|in\s+stock|available|most\s+stock|more\s+stock)\b/gi, "")
    .trim();

  const parts = [];
  if (priorContext.targetBrand && !trimmed.toLowerCase().includes(priorContext.targetBrand)) {
    parts.push(priorContext.targetBrand);
  }
  if (priorContext.gamingIntent && !trimmed.toLowerCase().includes("gaming")) {
    parts.push("gaming");
  }
  if (priorContext.targetProductType && !trimmed.toLowerCase().includes(priorContext.targetProductType)) {
    parts.push(priorContext.targetProductType);
  }
  if (cleanFollowupText.length > 0) {
    parts.push(cleanFollowupText);
  }

  const resultQuery = parts.join(" ").trim();
  return resultQuery.length > 0 ? resultQuery : (priorContext.targetProductType || trimmed);
}

/**
 * Advanced Query Intent & Constraint Extractor
 */
export function extractQueryFilters(queryText = "") {
  let maxPriceConstraint = null;
  let minPriceConstraint = null;
  let inStockConstraint = false;
  let targetBrand = null;
  let targetProductType = null;
  let gamingIntent = false;
  let unavailableCheck = false;
  let sortByPriceAsc = false;
  let mostStock = false;

  const normalized = queryText.toLowerCase();

  // 1. Unavailable / Non-existent inquiry check
  if (/\b(not\s+available|unavailable|out\s+of\s+stock|non[\s-]existent|missing|not\s+in\s+store)\b/i.test(normalized)) {
    unavailableCheck = true;
  }

  // 2. Gaming intent check
  if (/\b(gaming|game|gamer|playstation|xbox)\b/i.test(normalized)) {
    gamingIntent = true;
  }

  // 3. Price Sorting & Stock Sorting Flags
  if (/\b(cheaper|cheapest|cheaper ones|lowest price|price asc)\b/i.test(normalized)) {
    sortByPriceAsc = true;
  }
  if (/\b(most\s+stock|highest\s+stock|more\s+stock)\b/i.test(normalized)) {
    mostStock = true;
  }

  // 4. Price Range: "between 100000 and 300000", "from 100000 to 300000"
  const rangeRegex = /(?:between|from)\s+(?:lkr|rs\.?)?\s*(\d+(?:\,\d+)*)\s+(?:and|to|-)\s+(?:lkr|rs\.?)?\s*(\d+(?:\,\d+)*)/i;
  const matchRange = normalized.match(rangeRegex);
  if (matchRange) {
    const minVal = parseInt(matchRange[1].replace(/,/g, ""), 10);
    const maxVal = parseInt(matchRange[2].replace(/,/g, ""), 10);
    if (!isNaN(minVal) && !isNaN(maxVal)) {
      minPriceConstraint = Math.min(minVal, maxVal);
      maxPriceConstraint = Math.max(minVal, maxVal);
    }
  }

  // 5. Max Price: "under 600000", "below 200000", "less than 100000", "max 50000"
  if (maxPriceConstraint === null) {
    const maxRegex = /(?:under|below|less\s+than|max|budget\s*(?:is|of)?|within|cheaper\s+than)\s+(?:lkr|rs\.?)?\s*(\d+(?:\,\d+)*)/i;
    const matchMax = normalized.match(maxRegex);
    if (matchMax && matchMax[1]) {
      const parsedMax = parseInt(matchMax[1].replace(/,/g, ""), 10);
      if (!isNaN(parsedMax) && parsedMax > 0) {
        maxPriceConstraint = parsedMax;
      }
    }
  }

  // 6. Min Price: "above 100000", "more than 50000", "over 20000"
  if (minPriceConstraint === null) {
    const minRegex = /(?:above|more\s+than|over|greater\s+than|exceeding)\s+(?:lkr|rs\.?)?\s*(\d+(?:\,\d+)*)/i;
    const matchMin = normalized.match(minRegex);
    if (matchMin && matchMin[1]) {
      const parsedMin = parseInt(matchMin[1].replace(/,/g, ""), 10);
      if (!isNaN(parsedMin) && parsedMin > 0) {
        minPriceConstraint = parsedMin;
      }
    }
  }

  // 7. Stock Constraint: "in stock", "currently in stock", "available", "unit in stock"
  if (/\b(in\s+stock|available|currently\s+in\s+stock|has\s+stock|unit\s+in\s+stock|with\s+stock|at\s+least\s+one\s+unit)\b/i.test(normalized)) {
    inStockConstraint = true;
  }

  // 8. Known Brands
  const knownBrands = ["samsung", "apple", "razer", "asus", "nike", "dyson", "sony", "logitech", "dell", "bosch", "miele", "irobot", "xiaomi", "bowflex", "marmot", "speedo", "salomon", "nintendo", "jedel", "tefal", "the north face"];
  for (const b of knownBrands) {
    if (new RegExp(`\\b${b}\\b`, "i").test(normalized)) {
      targetBrand = b;
      break;
    }
  }

  // 9. Product Type / Category Keywords (normalized)
  if (/\b(laptops?|notebooks?|macbooks?|zephyrus|g14|g16|xps|pcs?|computers?)\b/i.test(normalized)) {
    targetProductType = "laptop";
  } else if (/\b(phones?|smartphones?|mobiles?|galaxy|iphones?|pixels?)\b/i.test(normalized)) {
    targetProductType = "phone";
  } else if (/\b(keyboards?|blackwidows?)\b/i.test(normalized)) {
    targetProductType = "keyboard";
  } else if (/\b(mouses?|mice)\b/i.test(normalized)) {
    targetProductType = "mouse";
  } else if (/\b(clothings?|clothes|apparel|shirts?|t-shirts?|pants?|joggers?|hoodies?|jackets?|activewear|sportswear|outerwear)\b|\bwear\b(?!able)/i.test(normalized)) {
    targetProductType = "clothing";
  } else if (/\b(shoes?|footwear|boots?|sneakers?|pegasus)\b/i.test(normalized)) {
    targetProductType = "footwear";
  } else if (/\b(appliances?|vacuums?|cleaning|dishwashers?|purifiers?|refrigerators?|steams?)\b/i.test(normalized)) {
    targetProductType = "appliance";
  }

  return {
    maxPriceConstraint,
    minPriceConstraint,
    inStockConstraint,
    targetBrand,
    targetProductType,
    gamingIntent,
    unavailableCheck,
    sortByPriceAsc,
    mostStock
  };
}

/**
 * Validates if a product document matches the target product type.
 */
export function validateProductType(product, targetType) {
  if (!targetType || !PRODUCT_TYPE_PATTERNS[targetType]) return true;

  if (targetType === "laptop") {
    const brand = (product.brand || "").toLowerCase();
    const name = (product.productName || "").toLowerCase();
    if (brand.includes("moleskine") || name.includes("moleskine")) {
      return false;
    }
  }

  const pattern = PRODUCT_TYPE_PATTERNS[targetType];
  const name = product.productName || "";
  const category = product.category || "";
  const desc = product.description || "";
  const specs = typeof product.specs === "object" ? JSON.stringify(product.specs) : (product.specs || "");

  const fullText = `${name} ${category} ${desc} ${specs}`;
  return pattern.test(fullText);
}

/**
 * Deduplicates product documents by their MongoDB Object _id (as string).
 * Preserves the document record with the highest vectorSearchScore.
 */
export function deduplicateProductsById(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return { deduplicated: [], duplicateCount: 0 };
  }

  const idMap = new Map();
  let duplicateCount = 0;

  for (const prod of products) {
    const idStr = prod._id ? prod._id.toString() : null;
    if (!idStr) continue;

    if (!idMap.has(idStr)) {
      idMap.set(idStr, prod);
    } else {
      duplicateCount++;
      const existing = idMap.get(idStr);
      const existingScore = existing.vectorSearchScore || 0;
      const currentScore = prod.vectorSearchScore || 0;
      if (currentScore > existingScore) {
        idMap.set(idStr, prod);
      }
    }
  }

  return {
    deduplicated: Array.from(idMap.values()),
    duplicateCount
  };
}

/**
 * Generates a 768-dimensional query embedding using Gemini API.
 */
async function generateQueryEmbedding(ai, queryText) {
  let model;
  let result;

  try {
    model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
    result = await model.embedContent({
      content: { parts: [{ text: queryText }] },
      outputDimensionality: REQUIRED_DIMENSIONS
    });
  } catch (err1) {
    if (err1.message.includes("404") || err1.message.includes("not found")) {
      model = ai.getGenerativeModel({ model: `models/${EMBEDDING_MODEL}` });
      result = await model.embedContent({
        content: { parts: [{ text: queryText }] },
        outputDimensionality: REQUIRED_DIMENSIONS
      });
    } else {
      throw new Error(`Gemini Embedding Error: ${err1.message}`);
    }
  }

  const vector = result && result.embedding ? result.embedding.values : null;

  if (!Array.isArray(vector) || vector.length !== REQUIRED_DIMENSIONS) {
    throw new Error(`Invalid embedding vector dimension: ${vector ? vector.length : "null"}. Expected ${REQUIRED_DIMENSIONS}.`);
  }

  const isValidNums = vector.every(v => typeof v === "number" && !isNaN(v) && isFinite(v));
  if (!isValidNums) {
    throw new Error("Vector contains invalid non-numeric or NaN values.");
  }

  return vector;
}

/**
 * Gets MongoDB Atlas products collection reference.
 */
async function getAtlasProductCollection() {
  const envUri = process.env.MONGO_URI || "";
  const targetUri = envUri.startsWith("mongodb+srv://") ? envUri : (process.env.ATLAS_MONGO_URI || ATLAS_FALLBACK_URI);

  if (mongoose.connection.readyState === 1 && mongoose.connection.host.includes("mongodb.net")) {
    return mongoose.connection.db.collection("products");
  }

  if (!global._atlasConnection) {
    global._atlasConnection = await mongoose.createConnection(targetUri, { serverSelectionTimeoutMS: 10000 }).asPromise();
  }
  return global._atlasConnection.db.collection("products");
}

/**
 * Executes MongoDB Atlas $vectorSearch aggregation.
 */
async function executeAtlasVectorSearch(queryVector, filters = {}, limit = 15) {
  const filterConditions = [];

  if (filters.inStockConstraint) {
    filterConditions.push({ hasActiveOffers: { $eq: true } });
  }

  if (filters.maxPriceConstraint !== null && filters.maxPriceConstraint !== undefined) {
    filterConditions.push({ minPrice: { $lte: filters.maxPriceConstraint } });
  }

  if (filters.minPriceConstraint !== null && filters.minPriceConstraint !== undefined) {
    filterConditions.push({ maxPrice: { $gte: filters.minPriceConstraint } });
  }

  const vectorSearchStage = {
    $vectorSearch: {
      index: VECTOR_INDEX,
      path: "embedding",
      queryVector: queryVector,
      numCandidates: limit * 10,
      limit: limit,
      ...(filterConditions.length > 0
        ? { filter: filterConditions.length === 1 ? filterConditions[0] : { $and: filterConditions } }
        : {})
    }
  };

  const pipeline = [
    vectorSearchStage,
    {
      $project: {
        _id: 1,
        productName: 1,
        brand: 1,
        category: 1,
        description: 1,
        specs: 1,
        minPrice: 1,
        maxPrice: 1,
        totalStock: 1,
        hasActiveOffers: 1,
        approvalStatus: 1,
        image: 1,
        vectorSearchScore: { $meta: "vectorSearchScore" }
      }
    }
  ];

  const collection = await getAtlasProductCollection();
  return await collection.aggregate(pipeline).toArray();
}

/**
 * Reranks and classifies retrieved products using multi-stage checks.
 */
export function rerankAndClassifyProducts(rawProducts = [], filters = {}) {
  const rawCount = rawProducts.length;

  // 1. Deduplicate by _id
  const { deduplicated, duplicateCount } = deduplicateProductsById(rawProducts);
  const dedupCount = deduplicated.length;

  if (dedupCount === 0) {
    return { items: [], matchType: "NO_MATCH", rawCount: 0, dedupCount: 0, duplicatesRemoved: 0 };
  }

  // 2. Validate product-type relevance
  let typeFiltered = deduplicated;
  if (filters.targetProductType) {
    const matchedTypes = deduplicated.filter(p => validateProductType(p, filters.targetProductType));
    if (matchedTypes.length > 0) {
      typeFiltered = matchedTypes;
    } else {
      typeFiltered = [];
    }
  }

  // 3. Filter by brand if specified
  let brandFiltered = typeFiltered;
  if (filters.targetBrand) {
    const brandLower = filters.targetBrand.toLowerCase();
    const matchedBrand = typeFiltered.filter(p => p.brand && p.brand.toLowerCase().includes(brandLower));
    if (matchedBrand.length > 0) {
      brandFiltered = matchedBrand;
    }
  }

  // 4. Separate exact price matches from price alternatives
  const exactMatches = [];
  const priceAlternatives = [];

  for (const prod of brandFiltered) {
    const minP = prod.minPrice;
    if (filters.maxPriceConstraint !== null) {
      if (minP !== null && minP !== undefined && minP <= filters.maxPriceConstraint) {
        exactMatches.push(prod);
      } else {
        priceAlternatives.push(prod);
      }
    } else {
      exactMatches.push(prod);
    }
  }

  // 5. Ranking exact matches
  if (exactMatches.length > 0) {
    if (filters.sortByPriceAsc) {
      exactMatches.sort((a, b) => {
        const pA = a.minPrice !== null && a.minPrice !== undefined ? a.minPrice : Infinity;
        const pB = b.minPrice !== null && b.minPrice !== undefined ? b.minPrice : Infinity;
        return pA - pB;
      });
    } else if (filters.mostStock) {
      exactMatches.sort((a, b) => (b.totalStock || 0) - (a.totalStock || 0));
    } else {
      exactMatches.sort((a, b) => (b.vectorSearchScore || 0) - (a.vectorSearchScore || 0));
    }
    return {
      items: exactMatches.slice(0, 5),
      matchType: "EXACT_MATCH",
      rawCount,
      dedupCount,
      duplicatesRemoved: duplicateCount
    };
  }

  // 6. Handling price mismatch -> Return higher-priced alternatives if available
  if (filters.maxPriceConstraint !== null && priceAlternatives.length > 0) {
    priceAlternatives.sort((a, b) => (b.vectorSearchScore || 0) - (a.vectorSearchScore || 0));
    return {
      items: priceAlternatives.slice(0, 5),
      matchType: "ALTERNATIVE_ONLY",
      rawCount,
      dedupCount,
      duplicatesRemoved: duplicateCount
    };
  }

  return {
    items: [],
    matchType: "NO_MATCH",
    rawCount,
    dedupCount,
    duplicatesRemoved: duplicateCount
  };
}

/**
 * Builds compact context for Gemini LLM.
 */
function buildProductContext(products, matchType, filters) {
  if (!products || products.length === 0 || matchType === "NO_MATCH") {
    return "NO_MATCH: No products in our current store catalog match the requested criteria.";
  }

  const prefixNote = matchType === "ALTERNATIVE_ONLY" 
    ? `NOTE: None of the products meet the strict price requirement (${filters.maxPriceConstraint} LKR). The following are HIGHER-PRICED ALTERNATIVES available in our store:\n\n` 
    : "";

  const itemsText = products.map((prod, index) => {
    const priceText = prod.minPrice !== null && prod.minPrice !== undefined
      ? (prod.minPrice === prod.maxPrice ? `LKR ${prod.minPrice.toLocaleString()}` : `LKR ${prod.minPrice.toLocaleString()} - LKR ${prod.maxPrice.toLocaleString()}`)
      : "No active offers";

    const stockText = prod.hasActiveOffers && prod.totalStock > 0
      ? `${prod.totalStock} units available`
      : "Out of Stock";

    const specsText = prod.specs && typeof prod.specs === "object"
      ? Object.entries(prod.specs).map(([k, v]) => `${k}: ${v}`).join(" | ")
      : (prod.specs || "N/A");

    return [
      `PRODUCT ${index + 1}:`,
      `ID: ${prod._id.toString()}`,
      `Name: ${prod.productName}`,
      `Brand: ${prod.brand || "N/A"}`,
      `Category: ${prod.category || "N/A"}`,
      `Price: ${priceText}`,
      `Stock Status: ${stockText}`,
      `Description: ${prod.description || "N/A"}`,
      `Specifications: ${specsText}`
    ].join("\n");
  }).join("\n\n---\n\n");

  return prefixNote + itemsText;
}

/**
 * Generates fallback answer directly from candidate products without LLM call.
 */
export function buildFallbackAnswer(userQuery, contextProducts, matchType, filters) {
  if (!contextProducts || contextProducts.length === 0 || matchType === "NO_MATCH") {
    if (filters.maxPriceConstraint !== null) {
      const typeLabel = filters.targetProductType ? `${filters.targetProductType} ` : "";
      return `We searched our store catalog, but unfortunately we do not have any ${typeLabel}products under LKR ${filters.maxPriceConstraint.toLocaleString()} at this time.`;
    }
    if (filters.targetProductType) {
      return `We searched our store catalog for "${userQuery}", but we currently do not carry ${filters.targetProductType} products matching your request.`;
    }
    return `We searched our store catalog, but could not find any matching products for "${userQuery}" at this time.`;
  }

  if (matchType === "ALTERNATIVE_ONLY") {
    const itemsList = contextProducts.slice(0, 3).map((p, idx) => {
      const priceStr = p.minPrice !== null ? `LKR ${p.minPrice.toLocaleString()}` : "Contact for price";
      return `${idx + 1}. **${p.productName}** (${p.brand || 'Store Item'}) - ${priceStr}`;
    }).join("\n");

    const typeLabel = filters.targetProductType ? `${filters.targetProductType} ` : "";
    return `Unfortunately, we do not have any ${typeLabel}products under LKR ${filters.maxPriceConstraint.toLocaleString()}. However, here are higher-priced alternatives available in our store:\n\n${itemsList}`;
  }

  const itemsList = contextProducts.slice(0, 5).map((p, idx) => {
    const priceStr = p.minPrice !== null
      ? (p.minPrice === p.maxPrice ? `LKR ${p.minPrice.toLocaleString()}` : `LKR ${p.minPrice.toLocaleString()} - LKR ${p.maxPrice.toLocaleString()}`)
      : "Contact for price";
    const stockStr = p.hasActiveOffers && p.totalStock > 0 ? `In Stock (${p.totalStock} available)` : "Out of Stock";
    return `${idx + 1}. **${p.productName}** (${p.brand || 'Store Item'})\n   - **Price:** ${priceStr}\n   - **Availability:** ${stockStr}`;
  }).join("\n\n");

  return `Here are the top matching products found in our store for "${userQuery}":\n\n${itemsList}\n\nPlease let us know if you need any further information!`;
}

/**
 * Generates grounded answer using Gemini LLM with conversation history context and 429 quota fallback.
 */
async function generateLlmAnswer(ai, userQuery, contextText, contextProducts = [], matchType = "EXACT_MATCH", filters = {}, options = {}) {
  if (options.skipLlm || matchType === "NO_MATCH") {
    return buildFallbackAnswer(userQuery, contextProducts, matchType, filters);
  }

  const recentHist = getRecentHistory(options.history || [], 4);
  const historySnippet = recentHist.length > 0
    ? recentHist.map(m => `${m.role === "user" ? "USER" : "MODEL"}: ${m.text}`).join("\n")
    : "No prior conversation history.";

  const systemInstruction = `
You are an intelligent e-commerce AI shopping assistant.
Your task is to answer customer inquiries based STRICTLY on the RETRIEVED PRODUCTS CONTEXT provided.

GROUNDING RULES:
1. Answer using ONLY the retrieved product facts (Name, Brand, Category, Price, Stock, Description, Specifications).
2. NEVER invent products, prices, stock quantities, or features not present in the context.
3. State prices in LKR exactly as given in the context.
4. Do NOT claim a product is in stock if Total Stock is 0 or Out of Stock.
5. If matchType is ALTERNATIVE_ONLY or context notes higher-priced items, CLEARLY state that no product exists meeting the user's price limit, and label the listed products as higher-priced alternatives.
6. If context states NO_MATCH or information is insufficient, state politely that the requested item or price range is currently unavailable in our catalog.
7. Be polite, concise, structured, and helpful.
8. If the user asks a follow-up question (e.g. comparing prices or stock of items discussed), compare the facts from the RETRIEVED PRODUCTS CONTEXT clearly.
`;

  const promptText = `${systemInstruction}\n\nRECENT CONVERSATION HISTORY:\n${historySnippet}\n\nRETRIEVED PRODUCTS CONTEXT:\n${contextText}\n\nCONTEXTUALIZED QUERY: ${options.contextualizedQuery || userQuery}\nUSER QUERY: ${userQuery}`;

  try {
    const model = ai.getGenerativeModel({ model: LLM_MODEL });
    const res = await model.generateContent(promptText);
    if (res && res.response && res.response.text) {
      return res.response.text();
    }
  } catch (err) {
    const isRateLimit = err.message.includes("429") || err.message.includes("quota") || err.message.includes("RESOURCE_EXHAUSTED");
    if (isRateLimit) {
      console.warn(`[Gemini LLM Rate Limit 429 Detected] Falling back to deterministic structured response.`);
    } else {
      console.warn(`[Gemini LLM Error]: ${err.message.split('\n')[0]}. Falling back to structured response.`);
    }
  }

  return buildFallbackAnswer(userQuery, contextProducts, matchType, filters);
}

/**
 * Main MongoDB Atlas RAG Handler Function (Conversational RAG Enabled).
 */
export async function processMongoDbRagQuery(message, options = {}) {
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new Error("Message string is required.");
  }

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const queryText = message.trim();
  const limit = options.limit || 15;
  const skipLlm = Boolean(options.skipLlm);
  const normHist = normalizeHistory(options.history || []);
  const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

  // 1. Contextualize query using conversation history
  const contextualizedQuery = await contextualizeUserQuery(queryText, normHist, ai);

  // 2. Extract query intent and constraints from contextualizedQuery
  const filters = extractQueryFilters(contextualizedQuery);

  // Preserve prior context filters if current turn is a detected follow-up
  if (detectFollowUpQuery(queryText, normHist)) {
    const priorContext = extractConversationContext(normHist);
    const directFilters = extractQueryFilters(queryText);

    // Safety Rule #9: Only preserve prior product type if current query did NOT introduce a new explicit product type
    if (!directFilters.targetProductType && priorContext.targetProductType) {
      filters.targetProductType = priorContext.targetProductType;
    }
    if (!directFilters.targetBrand && priorContext.targetBrand) {
      filters.targetBrand = priorContext.targetBrand;
    }
    if (priorContext.gamingIntent) {
      filters.gamingIntent = true;
    }
    if (directFilters.maxPriceConstraint === null && priorContext.maxPriceConstraint !== null) {
      filters.maxPriceConstraint = priorContext.maxPriceConstraint;
    }
    if (directFilters.sortByPriceAsc) {
      filters.sortByPriceAsc = true;
    }
    if (directFilters.mostStock) {
      filters.mostStock = true;
    }
  }

  // Handle explicit non-existent / unavailable inquiry
  if (filters.unavailableCheck) {
    return {
      success: true,
      answer: "We checked our catalog, but that requested item is currently unavailable in our store.",
      sources: [],
      totalRetrieved: 0,
      matchType: "NO_MATCH",
      appliedFilters: filters,
      rawCandidateCount: 0,
      deduplicatedCandidateCount: 0,
      duplicatesRemovedCount: 0
    };
  }

  // 3. Generate 768-dim query embedding using Gemini from contextualizedQuery
  let queryVector = null;
  try {
    queryVector = await generateQueryEmbedding(ai, contextualizedQuery);
  } catch (embErr) {
    console.warn("Embedding generation failed, attempting text-search fallback...", embErr.message);
    return {
      success: true,
      answer: buildFallbackAnswer(queryText, [], "NO_MATCH", filters),
      sources: [],
      totalRetrieved: 0,
      matchType: "NO_MATCH",
      appliedFilters: filters,
      rawCandidateCount: 0,
      deduplicatedCandidateCount: 0,
      duplicatesRemovedCount: 0
    };
  }

  // 4. Execute MongoDB Atlas $vectorSearch
  let rawRetrieved = [];
  try {
    rawRetrieved = await executeAtlasVectorSearch(queryVector, filters, limit);
  } catch (vectorErr) {
    console.warn("Filtered vector search error, retrying without price filter...", vectorErr.message);
    rawRetrieved = await executeAtlasVectorSearch(queryVector, { targetProductType: filters.targetProductType, inStockConstraint: filters.inStockConstraint }, limit);
  }

  // If strict price filter returned 0 items, retry search without price filter to fetch alternative candidates
  if (rawRetrieved.length === 0 && filters.maxPriceConstraint !== null) {
    rawRetrieved = await executeAtlasVectorSearch(queryVector, { targetProductType: filters.targetProductType, inStockConstraint: filters.inStockConstraint }, limit);
  }

  // 5. Strict multi-stage deduplication, filtering, ranking & match classification
  let {
    items: finalProducts,
    matchType,
    rawCount,
    dedupCount,
    duplicatesRemoved
  } = rerankAndClassifyProducts(rawRetrieved, filters);

  // If vector candidates did not contain matching product type, query collection directly by product type
  if (finalProducts.length === 0 && filters.targetProductType) {
    const rawPattern = PRODUCT_TYPE_PATTERNS[filters.targetProductType];
    if (rawPattern) {
      try {
        const strPattern = rawPattern.source.replace(/\\b/g, '');
        const collection = await getAtlasProductCollection();
        const directCandidates = await collection.find({
          $or: [
            { category: { $regex: strPattern, $options: "i" } },
            { productName: { $regex: strPattern, $options: "i" } }
          ]
        }).limit(limit).toArray();

        if (directCandidates.length > 0) {
          const recheck = rerankAndClassifyProducts(directCandidates, filters);
          if (recheck.items.length > 0) {
            finalProducts = recheck.items;
            matchType = recheck.matchType;
          }
        }
      } catch (errDb) {
        console.warn("Product type fallback search failed:", errDb.message);
      }
    }
  }

  // 6. Build compact context for LLM
  const contextText = buildProductContext(finalProducts, matchType, filters);

  // 7. Generate grounded LLM answer with history context
  const answer = await generateLlmAnswer(ai, queryText, contextText, finalProducts, matchType, filters, { skipLlm, history: normHist, contextualizedQuery });

  // 8. Format clean sources output (EXCLUDING embedding vectors)
  const sources = (finalProducts || []).map(p => ({
    productId: p._id ? p._id.toString() : "",
    productName: p.productName || "Unknown",
    brand: p.brand || "N/A",
    category: p.category || "N/A",
    minPrice: p.minPrice !== undefined ? p.minPrice : null,
    maxPrice: p.maxPrice !== undefined ? p.maxPrice : null,
    totalStock: p.totalStock !== undefined ? p.totalStock : 0,
    hasActiveOffers: Boolean(p.hasActiveOffers),
    approvalStatus: p.approvalStatus || "N/A",
    image: p.image || "",
    score: p.vectorSearchScore ? Number(p.vectorSearchScore.toFixed(4)) : null
  }));

  return {
    success: true,
    answer,
    sources,
    totalRetrieved: sources.length,
    matchType,
    appliedFilters: filters,
    contextualizedQuery,
    rawCandidateCount: rawCount,
    deduplicatedCandidateCount: dedupCount,
    duplicatesRemovedCount: duplicatesRemoved
  };
}

export default {
  normalizeHistory,
  getRecentHistory,
  detectFollowUpQuery,
  extractConversationContext,
  contextualizeUserQuery,
  extractQueryFilters,
  validateProductType,
  deduplicateProductsById,
  rerankAndClassifyProducts,
  buildFallbackAnswer,
  processMongoDbRagQuery
};
