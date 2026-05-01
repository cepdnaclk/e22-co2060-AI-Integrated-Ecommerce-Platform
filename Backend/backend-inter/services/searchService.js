import { GoogleGenerativeAI } from "@google/generative-ai";
import Product from "../models/products.js";
import ProductVariant from "../models/productVariant.js";
import SellerOffer from "../models/sellerOffer.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const EMBEDDING_MODEL = "text-embedding-004";

/* ─────────────────────────────────────────────────────
 * EMBEDDING CACHE  (in-memory, TTL 1 h)
 * Avoids repeating Gemini API calls for the same query
 * ───────────────────────────────────────────────────── */
const embCache = new Map();  // key → { vec, ts }
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getEmbedding(text) {
    const key = text.slice(0, 120).toLowerCase();
    const cached = embCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.vec;

    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    const vec = result.embedding.values;
    embCache.set(key, { vec, ts: Date.now() });
    return vec;
}

function cosineSimilarity(a, b) {
    let dot = 0, ma = 0, mb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; ma += a[i] ** 2; mb += b[i] ** 2; }
    return dot / (Math.sqrt(ma) * Math.sqrt(mb) + 1e-10);
}

/* ─────────────────────────────────────────────────────
 * BUILD OFFER PIPELINE (shared by layers)
 * ───────────────────────────────────────────────────── */
async function buildOffersForProduct(productId) {
    return SellerOffer.find({ productId, isActive: true })
        .select("sellerId sellerName price stock warranty discountPercentage deliveryOptions image variantId")
        .populate("variantId", "variantName color storage size image")
        .sort({ price: 1 })
        .lean();
}

async function buildOffersForVariant(variantId) {
    return SellerOffer.find({ variantId, isActive: true })
        .select("sellerId sellerName price stock warranty discountPercentage deliveryOptions image productId")
        .sort({ price: 1 })
        .lean();
}

/* ─────────────────────────────────────────────────────
 * LAYER 1 – MongoDB TEXT INDEX (Inverted Index)
 * Searches Product and ProductVariant collections.
 * ───────────────────────────────────────────────────── */
async function layer1TextSearch(q, category) {
    const textFilter = { $text: { $search: q } };
    if (category && category !== "null") textFilter.category = category;

    const [products, variants] = await Promise.all([
        Product.find(textFilter, { score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } })
            .limit(20)
            .lean(),

        ProductVariant.find(
            { $text: { $search: q }, isActive: true },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .limit(20)
            .populate("productId", "productName image category brand description")
            .lean(),
    ]);

    return { products, variants };
}

/* ─────────────────────────────────────────────────────
 * LAYER 2 – Regex Fallback
 * ───────────────────────────────────────────────────── */
async function layer2RegexSearch(q, category) {
    const re = new RegExp(q.split(" ").join("|"), "i");
    const catFilter = category && category !== "null" ? { category } : {};

    const [products, variants] = await Promise.all([
        Product.find({
            ...catFilter,
            $or: [
                { productName: re },
                { brand: re },
                { description: re },
            ],
        }).limit(20).lean(),

        ProductVariant.find({
            isActive: true,
            $or: [
                { variantName: re },
                { color: re },
                { storage: re },
                { searchText: re },
            ],
        })
            .limit(20)
            .populate("productId", "productName image category brand description")
            .lean(),
    ]);

    return { products, variants };
}

/* ─────────────────────────────────────────────────────
 * LAYER 3 – Gemini Semantic Embedding Search
 * Only called when layers 1+2 returned < 3 results.
 * ───────────────────────────────────────────────────── */
async function layer3SemanticSearch(q, category) {
    try {
        const qVec = await getEmbedding(q);

        // Pull a candidate pool from DB
        const catFilter = category && category !== "null" ? { category } : {};
        const candidates = await Product.find(catFilter)
            .select("productName category brand description image")
            .limit(80)
            .lean();

        // Score each candidate
        const scored = await Promise.all(
            candidates.map(async (p) => {
                const text = `${p.productName} ${p.brand ?? ""} ${p.category} ${p.description ?? ""}`;
                try {
                    const pVec = await getEmbedding(text);
                    return { product: p, score: cosineSimilarity(qVec, pVec) };
                } catch {
                    return { product: p, score: 0 };
                }
            })
        );

        const top = scored
            .filter((s) => s.score > 0.55)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map((s) => s.product);

        return { products: top, variants: [] };
    } catch (err) {
        console.error("❌ Layer 3 (semantic) failed:", err.message);
        return { products: [], variants: [] };
    }
}

/* ─────────────────────────────────────────────────────
 * MERGE & DEDUPLICATE results from all layers
 * ───────────────────────────────────────────────────── */
function mergeResults(l1, l2, l3) {
    const seenProducts = new Set();
    const seenVariants = new Set();
    const products = [];
    const variants = [];

    for (const src of [l1, l2, l3]) {
        for (const p of src.products || []) {
            const id = String(p._id);
            if (!seenProducts.has(id)) { seenProducts.add(id); products.push(p); }
        }
        for (const v of src.variants || []) {
            const id = String(v._id);
            if (!seenVariants.has(id)) { seenVariants.add(id); variants.push(v); }
        }
    }

    return { products, variants };
}

/* ─────────────────────────────────────────────────────
 * MAIN SEARCH FUNCTION
 * ───────────────────────────────────────────────────── */
export async function smartSearch({ q, category, sort = "price_asc", page = 1, limit = 12 }) {
    const skip = (page - 1) * Number(limit);

    /* Run L1 + L2 in parallel */
    const [l1, l2] = await Promise.all([
        layer1TextSearch(q, category).catch(() => ({ products: [], variants: [] })),
        layer2RegexSearch(q, category).catch(() => ({ products: [], variants: [] })),
    ]);

    let merged = mergeResults(l1, l2, { products: [], variants: [] });

    /* Only invoke L3 when results are thin */
    if (merged.products.length + merged.variants.length < 3) {
        const l3 = await layer3SemanticSearch(q, category);
        merged = mergeResults(merged, l3, { products: [], variants: [] });
    }

    /* ── Attach offers to each result ── */
    const results = [];

    // Variant hits – dominant match type
    for (const variant of merged.variants) {
        const offersForVariant = await buildOffersForVariant(variant._id);
        const offersForProduct = await buildOffersForProduct(variant.productId?._id || variant.productId);
        const allOffers = [...offersForVariant, ...offersForProduct];

        results.push({
            type: "variant",
            variantId: variant._id,
            variantName: variant.variantName,
            color: variant.color,
            storage: variant.storage,
            image: variant.image || variant.productId?.image,
            product: variant.productId,
            offers: allOffers,
            minPrice: allOffers.length ? Math.min(...allOffers.map((o) => o.price)) : null,
            sellerCount: allOffers.length,
        });
    }

    // Product hits (no specific variant)
    const variantProductIds = new Set(
        merged.variants.map((v) => String(v.productId?._id ?? v.productId))
    );

    for (const product of merged.products) {
        if (variantProductIds.has(String(product._id))) continue; // already covered by variant
        const offers = await buildOffersForProduct(product._id);
        results.push({
            type: "product",
            product,
            offers,
            minPrice: offers.length ? Math.min(...offers.map((o) => o.price)) : null,
            sellerCount: offers.length,
        });
    }

    /* ── Sort ── */
    if (sort === "price_asc") results.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
    else if (sort === "price_desc") results.sort((a, b) => (b.minPrice ?? -Infinity) - (a.minPrice ?? -Infinity));

    const total = results.length;
    const paginated = results.slice(skip, skip + Number(limit));

    return { results: paginated, total, page: Number(page), pages: Math.ceil(total / limit) };
}

/* ─────────────────────────────────────────────────────
 * AI AUTOCOMPLETE  (Gemini text generation)
 * Given a partial query, returns up to 5 corrected /
 * expanded suggestions.
 * ───────────────────────────────────────────────────── */
export async function getAutocompleteSuggestions(partial) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are a search autocomplete assistant for an electronics e-commerce platform.
The user is typing a product search query. Given the partial input below, return exactly 5 relevant, 
corrected and distinct search suggestions as a JSON array of strings. 
Keep each suggestion short (2–5 words). No explanations.

Partial input: "${partial}"

Return ONLY valid JSON like: ["suggestion 1","suggestion 2","suggestion 3","suggestion 4","suggestion 5"]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Extract JSON array from response
        const match = text.match(/\[.*\]/s);
        if (!match) return [];
        const suggestions = JSON.parse(match[0]);
        return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
    } catch (err) {
        console.error("❌ Autocomplete error:", err.message);
        return [];
    }
}
