import cron from "node-cron";
import axios from "axios";

const RECO_URL = process.env.RECOMMENDATION_SERVICE_URL || "http://localhost:8001";

// Daily at 02:00
cron.schedule("0 2 * * *", async () => {
  try {
    await axios.post(`${RECO_URL}/recommend/graph/rebuild`, {}, { timeout: 20000 });
    console.log("⏰ Recommendation graph rebuild completed");
  } catch (error) {
    console.error("❌ Recommendation graph rebuild failed:", error.message);
  }
});

