import express from "express";
import { 
  getPayouts, 
  getEligiblePayouts, 
  getPayoutById, 
  runPayouts, 
  retryPayout 
} from "../controllers/payoutController.js";

const router = express.Router();

router.get("/", getPayouts);
router.get("/eligible", getEligiblePayouts);
router.get("/:id", getPayoutById);
router.post("/run", runPayouts);
router.post("/:id/retry", retryPayout);

export default router;
