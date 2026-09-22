import cron from "node-cron";
import { generateMarketingCampaign } from "../services/automationService.js";

const cronSchedule = process.env.MARKETING_AUTOMATION_CRON || "0 10 * * *"; // Daily at 10:00 AM

// Run daily marketing automation if enabled
if (process.env.ENABLE_MARKETING_AUTOMATION === "true") {
  cron.schedule(cronSchedule, async () => {
    console.log("⏰ Running Autonomous LangChain Marketing Campaign Agent...");
    try {
      const result = await generateMarketingCampaign();
      console.log("✅ Autonomous Campaign Generated for Product:", result?.campaign?.matched_product_name);
      console.log("📝 Campaign Headline:", result?.campaign?.headline);
    } catch (err) {
      console.error("❌ Marketing automation cron failed:", err.message);
    }
  });

  console.log(`✅ LangChain Marketing Automation cron job registered (${cronSchedule}).`);
} else {
  console.log("ℹ️  ENABLE_MARKETING_AUTOMATION is not 'true' — scheduled marketing cron is idle (available via API).");
}
