import { smartSearch, getAutocompleteSuggestions } from "../services/searchService.js";

/**
 * ======================================================
 * GET /api/search
 * ======================================================
 * Unified smart search across Products + ProductVariants + SellerOffers
 * Query params:
 *   q        – search text
 *   category – filter by category
 *   sort     – price_asc | price_desc | relevance
 *   page     – pagination (default 1)
 *   limit    – results per page (default 12)
 */
export async function search(req, res) {
    try {
        const { q, category, sort = "price_asc", page = 1, limit = 12 } = req.query;

        if (!q || !q.trim()) {
            return res.status(400).json({ message: "Search query `q` is required" });
        }

        const data = await smartSearch({
            q: q.trim(),
            category,
            sort,
            page: Number(page),
            limit: Number(limit),
        });

        res.json(data);
    } catch (error) {
        console.error("❌ Search error:", error);
        res.status(500).json({
            results: [],
            total: 0,
            message: "Search failed",
            error: error.message,
        });
    }
}

/**
 * ======================================================
 * GET /api/search/autocomplete?q=partial
 * ======================================================
 * Returns up to 5 AI-corrected autocomplete suggestions
 */
export async function autocomplete(req, res) {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json({ suggestions: [] });
        }
        const suggestions = await getAutocompleteSuggestions(q.trim());
        res.json({ suggestions });
    } catch (error) {
        console.error("❌ Autocomplete error:", error);
        res.json({ suggestions: [] });
    }
}
