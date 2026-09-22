import { GoogleGenerativeAI } from "@google/generative-ai";
import { askSupportAgent } from "../services/automationService.js";

/**
 * AI Chatbot Controller (Tool-Augmented LangChain Assistant with Gemini Fallback)
 */
export async function handleChatMessage(req, res) {
    try {
        const { currentMessage, history = [] } = req.body;

        if (!currentMessage) {
            return res.status(400).json({ error: "Message is required." });
        }

        // 1️⃣ Try tool-augmented LangChain Support Agent first
        try {
            const agentResponse = await askSupportAgent(currentMessage, history);
            if (agentResponse && agentResponse.reply) {
                return res.status(200).json({ reply: agentResponse.reply, source: "langchain-agent" });
            }
        } catch (agentError) {
            console.warn("⚠️ LangChain agent unreachable or failed, falling back to direct LLM:", agentError.message);
        }

        // 2️⃣ Fallback: direct Gemini LLM chat session
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Formatting previous history for Gemini
        const formattedHistory = history.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
        }));

        // Start a chat session with history and system instructions
        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
            },
        });

        const systemInstruction = `
You are the official customer support AI for "I-Computers", a premium e-commerce platform for tech enthusiasts.
Follow these rules:
1. Be helpful, professional, and friendly.
2. If asked about shipping, say standard shipping is 3-5 business days.
3. If asked about returns, mention our 30-day return policy.
4. Keep your responses relatively concise.
5. Format your response clearly using markdown.

User's message: ${currentMessage}
    `;

        const result = await chat.sendMessage(systemInstruction);
        const responseText = result.response.text();

        res.status(200).json({ reply: responseText, source: "gemini-direct" });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ error: "Failed to generate AI response. Please try again later." });
    }
}
