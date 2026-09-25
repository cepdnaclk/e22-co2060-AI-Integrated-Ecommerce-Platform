import { processMongoDbRagQuery } from "../services/mongodbRagService.js";

/**
 * Controller handler for POST /api/chat/mongodb-rag
 * 
 * Accepts: { "message": "I need a powerful gaming keyboard" }
 * Returns: { "success": true, "answer": "...", "sources": [...] }
 */
export async function handleMongoDbRagChat(req, res) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Invalid request: 'message' string is required."
      });
    }

    const result = await processMongoDbRagQuery(message.trim());

    return res.status(200).json(result);

  } catch (error) {
    console.error("❌ MongoDB RAG Controller Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during RAG retrieval."
    });
  }
}

export default handleMongoDbRagChat;
