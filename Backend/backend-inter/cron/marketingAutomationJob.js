import cron from "node-cron";
import { executeAutomatedFacebookPost } from "../services/facebookAutoPosterService.js";

const cronSchedule = process.env.MARKETING_AUTOMATION_CRON || "0 10 * * *"; // Daily at 10:00 AM

// Run daily marketing automation if enabled
if (process.env.ENABLE_MARKETING_AUTOMATION === "true") {
  cron.schedule(cronSchedule, async () => {
    console.log("⏰ Running Autonomous LangChain Marketing & Facebook Posting Pipeline...");
    try {
      const result = await executeAutomatedFacebookPost({
        mode: "optimal_time", // Schedules for peak engagement
        tone: "hype",
        campaignType: "product_spotlight"
      });
      console.log(`✅ Automated Campaign & Post processed [status: ${result.status}] for ${result.campaign?.matched_product_name}`);
      if (result.graphPostId) {
        console.log(`📱 Facebook Live Post ID: ${result.graphPostId}`);
      }
    } catch (err) {
      console.error("❌ Marketing automation cron failed:", err.message);
    }
  });

  console.log(`✅ LangChain Marketing Automation cron job registered (${cronSchedule}).`);
} else {
  console.log("ℹ️  ENABLE_MARKETING_AUTOMATION is not 'true' — scheduled marketing cron is idle (available via API).");
}

