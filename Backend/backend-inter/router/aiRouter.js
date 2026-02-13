import express from "express";
import { saveAIResults } from "../controllers/aiResultController.js";

const router = express.Router();

router.post("/result", saveAIResults);

export default router;
