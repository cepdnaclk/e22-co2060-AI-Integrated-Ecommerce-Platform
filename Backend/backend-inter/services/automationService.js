import axios from "axios";

const AUTOMATION_URL = process.env.AUTOMATION_AGENT_URL || "http://automation-agent:8004";
const TIMEOUT_MS = 25000;

/**
 * Check if the LangChain automation service is accessible and healthy.
 */
export async function checkAutomationHealth() {
  try {
    const res = await axios.get(`${AUTOMATION_URL}/health`, { timeout: 3000 });
    return res.data;
  } catch (err) {
    return {
      status: "unavailable",
      message: err.message,
      service: "langchain-automation-agent"
    };
  }
}

/**
 * Trigger the LangChain Autonomous Marketing Campaign Agent.
 */
export async function generateMarketingCampaign(trendOverride = null) {
  const payload = trendOverride ? { trend_override: trendOverride } : {};
  const res = await axios.post(`${AUTOMATION_URL}/automation/marketing-campaign`, payload, {
    timeout: TIMEOUT_MS
  });
  return res.data;
}

/**
 * Send customer query to the LangChain Tool-Augmented Support Agent.
 */
export async function askSupportAgent(message, history = []) {
  const res = await axios.post(
    `${AUTOMATION_URL}/automation/chat`,
    { message, history },
    { timeout: TIMEOUT_MS }
  );
  return res.data;
}

/**
 * Trigger LangChain Inventory Restock Review.
 */
export async function runRestockReview() {
  const res = await axios.post(`${AUTOMATION_URL}/automation/restock-review`, {}, {
    timeout: TIMEOUT_MS
  });
  return res.data;
}
