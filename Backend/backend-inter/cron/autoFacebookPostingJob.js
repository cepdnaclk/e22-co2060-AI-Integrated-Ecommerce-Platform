import cron from "node-cron";
import { executeAutomatedFacebookPost } from "../services/facebookAutoPosterService.js";

const cronSchedule = process.env.FB_AUTO_POST_CRON || "0 11 * * *"; // Daily at 11:00 AM by default

if (process.env.ENABLE_FACEBOOK_AUTO_POSTING === "true") {
  cron.schedule(cronSchedule, async () => {
    console.log("⏰ [Cron] Starting Autonomous Facebook Posting Automation...");
    try {
      const result = await executeAutomatedFacebookPost({ mode: "now" });
      console.log(`✅ [Cron] Automated Facebook post completed with status: ${result.status}`);
      if (result.graphPostId) {
        console.log(`📱 [Cron] Facebook Post ID: ${result.graphPostId}`);
      }
    } catch (err) {
      console.error("❌ [Cron] Automated Facebook posting job failed:", err.message);
    }
  });

  console.log(`✅ Autonomous Facebook Posting cron job registered (${cronSchedule}).`);
} else {
  console.log("ℹ️  ENABLE_FACEBOOK_AUTO_POSTING is not 'true' — scheduled auto-posting is idle (can still be triggered via API /api/facebook/auto-post).");
}
