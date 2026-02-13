import cron from "node-cron";
import { sendProductsToAI } from "../services/aiService.js";

// Every day at 2 AM
cron.schedule("0 2 * * *", async () => {
  console.log("⏰ Daily AI cron started");
  await sendProductsToAI();
});
