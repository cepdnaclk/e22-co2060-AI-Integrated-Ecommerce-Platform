import express from "express";
import { search, autocomplete } from "../controllers/searchController.js";

const router = express.Router();

/**
 * GET /api/search?q=&category=&sort=&page=&limit=
 * Unified smart search (Product + Variant + Offer)
 */
router.get("/", search);

/**
 * GET /api/search/autocomplete?q=partial
 * AI-powered autocomplete suggestions (Gemini)
 */
router.get("/autocomplete", autocomplete);

export default router;
