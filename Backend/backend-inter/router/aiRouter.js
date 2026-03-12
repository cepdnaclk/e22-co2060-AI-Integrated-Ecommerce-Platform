import express from "express";
import { saveAIResults } from "../controllers/aiResultController.js";
import { getProductSuggestions, getProductDetails } from "../controllers/aiProductController.js";

const router = express.Router();

router.post("/result", saveAIResults);

// AI-powered product auto-suggestion and auto-fill
router.post("/product-suggest", getProductSuggestions);
router.post("/product-details", getProductDetails);

export default router;
