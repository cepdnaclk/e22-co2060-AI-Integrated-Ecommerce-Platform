import cron from "node-cron";
import { sendProductsToAI } from "../services/aiService.js";

// Only register the cron job if the AI service is configured.
// Without AI_SERVICE_URL the job would flood logs with ENOTFOUND errors
// and cause Railway's rate limiter to kill the backend process.
if (!process.env.AI_SERVICE_URL) {
  console.log(
    "⚠️  AI_SERVICE_URL is not set — daily AI sync cron job is disabled."
  );
} else {
  // Every day at 2 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("⏰ Daily AI cron started");
    await sendProductsToAI();
  });

  console.log("✅ Daily AI sync cron job registered (runs at 02:00 daily).");
}
