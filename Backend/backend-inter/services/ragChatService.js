import axios from "axios";

function getRagServiceUrl() {
  return process.env.RAG_SERVICE_URL || "http://localhost:8010";
}

function getRagTimeoutMs() {
  const parsed = Number.parseInt(process.env.RAG_CHAT_TIMEOUT_MS || "60000", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60000;
}

export function isRagChatEnabled() {
  return (process.env.RAG_CHAT_ENABLED || "true").toLowerCase() === "true";
}

function createClient() {
  return axios.create({
    baseURL: getRagServiceUrl(),
    timeout: getRagTimeoutMs(),
    headers: { "Content-Type": "application/json" },
  });
}

function extractServiceError(err) {
  const detail = err.response?.data?.detail;
  return detail || err.message || "RAG service unavailable";
}

export async function requestRagChat({ currentMessage, history = [] }) {
  if (!isRagChatEnabled()) {
    return null;
  }

  try {
    const client = createClient();
    const { data } = await client.post("/chat", { currentMessage, history });
    if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("RAG service returned an empty response");
    }
    return data;
  } catch (err) {
    const message = extractServiceError(err);
    throw new Error(message);
  }
}

export async function ragHealthCheck() {
  if (!isRagChatEnabled()) {
    return { status: "disabled" };
  }

  try {
    const client = createClient();
    const { data } = await client.get("/health");
    return data;
  } catch (err) {
    return { status: "unreachable", detail: extractServiceError(err) };
  }
}
