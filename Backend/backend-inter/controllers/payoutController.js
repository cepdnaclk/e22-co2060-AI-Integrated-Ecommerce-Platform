import { 
  getEligibleSellerPayouts, 
  createPayoutBatch, 
  processSellerPayout 
} from "../services/payoutService.js";
import SellerPayout from "../models/sellerPayout.js";

export const getPayouts = async (req, res) => {
  try {
    const payouts = await SellerPayout.find().sort({ createdAt: -1 });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEligiblePayouts = async (req, res) => {
  try {
    const eligible = await getEligibleSellerPayouts();
    res.json(eligible);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPayoutById = async (req, res) => {
  try {
    const payout = await SellerPayout.findOne({ payoutId: req.params.id });
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const runPayouts = async (req, res) => {
  try {
    const batches = await createPayoutBatch();
    const results = [];
    
    for (const batch of batches) {
      try {
        const result = await processSellerPayout(batch.payoutId);
        results.push(result);
      } catch (err) {
        results.push({ payoutId: batch.payoutId, error: err.message });
      }
    }
    
    res.json({ message: "Payout run completed", results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const retryPayout = async (req, res) => {
  try {
    const result = await processSellerPayout(req.params.id);
    res.json({ message: "Retry processed", result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
