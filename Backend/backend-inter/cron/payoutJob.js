import cron from "node-cron";
import { PAYOUT_POLICY } from "../constants/payoutPolicy.js";
import { createPayoutBatch, processSellerPayout } from "../services/payoutService.js";

// Run according to configured policy (default: 02:00 AM SLT daily)
cron.schedule(PAYOUT_POLICY.PAYOUT_TIME_CRON, async () => {
  console.log("⏰ Daily seller payout job started");
  try {
    const batches = await createPayoutBatch();
    console.log(`✅ Created ${batches.length} payout batches.`);
    
    for (const batch of batches) {
      try {
        await processSellerPayout(batch.payoutId);
      } catch (err) {
        console.error(`❌ Failed to process payout ${batch.payoutId}:`, err.message);
      }
    }
  } catch (err) {
    console.error("❌ Fatal error in daily payout job:", err.message);
  }
}, {
  timezone: "Asia/Colombo"
});

console.log(`✅ Seller payout cron job registered (runs ${PAYOUT_POLICY.PAYOUT_TIME_CRON} Asia/Colombo).`);
