import { GoogleGenerativeAI } from "@google/generative-ai";
import { isRagChatEnabled, requestRagChat } from "../services/ragChatService.js";
import Product from "../models/products.js";

const PRODUCT_COUNT_PATTERNS = [
    /\bhow many products\b/i,
    /\bnumber of products\b/i,
    /\btotal products\b/i,
    /\bproducts do you have\b/i,
    /\bcount (of )?products\b/i,
];

const LATEST_PRODUCTS_PATTERNS = [
    /\blatest products?\b/i,
    /\bnew(est)? products?\b/i,
    /\bnew arrivals?\b/i,
    /\brecent products?\b/i,
    /\bjust added products?\b/i,
    /\bproducts? (you|u) have (latest|new)\b/i,
    /\bwhat are the latest products\b/i,
];

const LATEST_PRODUCTS_PRICE_PATTERNS = [
    /\bwhat are the prices?\b/i,
    /\bprices? of (them|these|those)\b/i,
    /\bprices? (for|of) (latest|new) products?\b/i,
    /\bprice list\b/i,
];

const GREETING_PATTERNS = [
    /^(hi|hello|hey|hii+|heyy+)\b/i,
    /^(good morning|good afternoon|good evening)\b/i,
];

function isProductCountQuestion(message) {
    return PRODUCT_COUNT_PATTERNS.some((pattern) => pattern.test(message));
}

function isLatestProductsQuestion(message) {
    return LATEST_PRODUCTS_PATTERNS.some((pattern) => pattern.test(message));
}

function isLatestProductsPriceQuestion(message) {
    return LATEST_PRODUCTS_PRICE_PATTERNS.some((pattern) => pattern.test(message));
}

function isGreetingMessage(message) {
    const normalized = message.trim().toLowerCase();
    if (!normalized || normalized.length > 40) return false;
    return GREETING_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * AI Chatbot Controller (Weather + E-Commerce RAG with Gemini fallback)
 */
export async function handleChatMessage(req, res) {
    const { currentMessage, history = [] } = req.body || {};
    const message = typeof currentMessage === "string" ? currentMessage.trim() : "";

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    // Keep greetings out of retrieval to avoid irrelevant catalog/weather responses.
    if (isGreetingMessage(message)) {
        return res.status(200).json({
            reply: "Hi! I am your I-Computers Weather + Shopping assistant. Ask me about weather-ready product choices, product count, price checks, delivery, or returns.",
            provider: "rule-greeting",
            sources: [],
        });
    }

    const normalizedHistory = Array.isArray(history)
        ? history
            .filter((msg) => msg && typeof msg.text === "string" && msg.text.trim())
            .map((msg) => ({
                role: msg.role === "user" ? "user" : "model",
                text: msg.text.trim(),
            }))
        : [];

    // Direct database answer for stock-size questions.
    if (isProductCountQuestion(message)) {
        try {
            const totalProducts = await Product.countDocuments({});
            return res.status(200).json({
                reply: `We currently have **${totalProducts}** products in our catalog.`,
                provider: "mongo-direct",
                sources: ["mongodb://products"],
            });
        } catch (error) {
            console.error("Product count query failed:", error.message);
        }
    }

    // Direct database answer for "what are the prices of them/latest products".
    if (isLatestProductsPriceQuestion(message)) {
        try {
            const latestWithPrices = await Product.aggregate([
                { $sort: { createdAt: -1 } },
                { $limit: 6 },
                {
                    $lookup: {
                        from: "selleroffers",
                        localField: "_id",
                        foreignField: "productId",
                        as: "offers",
                    },
                },
                {
                    $addFields: {
                        minPrice: {
                            $min: {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: "$offers",
                                            as: "o",
                                            cond: { $eq: ["$$o.isActive", true] },
                                        },
                                    },
                                    as: "x",
                                    in: "$$x.price",
                                },
                            },
                        },
                    },
                },
                {
                    $project: {
                        productName: 1,
                        category: 1,
                        brand: 1,
                        minPrice: 1,
                    },
                },
            ]);

            if (!latestWithPrices.length) {
                return res.status(200).json({
                    reply: "I could not find products in the catalog right now.",
                    provider: "mongo-direct",
                    sources: ["mongodb://products"],
                });
            }

            const lines = latestWithPrices
                .map((item, index) => {
                    const name = item.productName || "Unnamed product";
                    const brand = item.brand ? ` (${item.brand})` : "";
                    const priceText = Number.isFinite(item.minPrice)
                        ? `LKR ${Number(item.minPrice).toLocaleString()}`
                        : "No active seller price yet";
                    return `${index + 1}. ${name}${brand} — ${priceText}`;
                })
                .join("\n");

            return res.status(200).json({
                reply: `Here are the latest product prices:\n${lines}`,
                provider: "mongo-direct",
                sources: ["mongodb://products", "mongodb://selleroffers"],
            });
        } catch (error) {
            console.error("Latest product prices query failed:", error.message);
        }
    }

    // Direct database answer for "latest/new products" questions.
    if (isLatestProductsQuestion(message)) {
        try {
            const latestProducts = await Product.find({})
                .sort({ createdAt: -1 })
                .limit(6)
                .select("productName category brand")
                .lean();

            if (!latestProducts.length) {
                return res.status(200).json({
                    reply: "I could not find products in the catalog right now.",
                    provider: "mongo-direct",
                    sources: ["mongodb://products"],
                });
            }

            const list = latestProducts
                .map((item, index) => {
                    const name = item.productName || "Unnamed product";
                    const category = item.category ? ` - ${item.category}` : "";
                    const brand = item.brand ? ` (${item.brand})` : "";
                    return `${index + 1}. ${name}${brand}${category}`;
                })
                .join("\n");

            return res.status(200).json({
                reply: `Here are our latest products:\n${list}\n\nIf you want, I can also check prices for any of these by name.`,
                provider: "mongo-direct",
                sources: ["mongodb://products"],
            });
        } catch (error) {
            console.error("Latest products query failed:", error.message);
        }
    }

    let ragError = null;
    if (isRagChatEnabled()) {
        try {
            const ragResponse = await requestRagChat({
                currentMessage: message,
                history: normalizedHistory,
            });

            return res.status(200).json({
                reply: ragResponse.reply,
                provider: ragResponse.provider || "rag",
                sources: Array.isArray(ragResponse.sources) ? ragResponse.sources : [],
            });
        } catch (error) {
            ragError = error;
            console.error("RAG Chat Error:", error.message);
        }
    }

    try {
        const llmProvider = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
        const geminiFallbackEnabled = process.env.GEMINI_FALLBACK_ENABLED
            ? process.env.GEMINI_FALLBACK_ENABLED.toLowerCase() === "true"
            : llmProvider !== "ollama";

        if (!geminiFallbackEnabled) {
            const detail = ragError ? `RAG error: ${ragError.message}` : "RAG service unavailable.";
            return res.status(503).json({
                error: `Chat service is temporarily unavailable. ${detail}`,
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            const ragDetail = ragError ? ` RAG error: ${ragError.message}` : "";
            return res.status(500).json({
                error: `GEMINI_API_KEY is not configured on the server.${ragDetail}`,
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        const model = genAI.getGenerativeModel({ model: geminiModel });

        // Gemini requires the first history message to be from user.
        const formattedHistory = [];
        for (const msg of normalizedHistory) {
            if (formattedHistory.length === 0 && msg.role !== "user") continue;
            formattedHistory.push({
                role: msg.role,
                parts: [{ text: msg.text }],
            });
        }

        // Start a chat session with history and fallback system instructions
        const chat = model.startChat({
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
            },
        });

        const systemInstruction = `
You are the official assistant for "I-Computers", a premium e-commerce platform.
Follow these rules:
1. Be helpful, professional, and friendly.
2. If asked about weather, provide practical weather guidance with brief, clear language.
3. If asked about shipping, say standard shipping is 3-5 business days.
4. If asked about returns, mention our 30-day return policy.
5. If answer is uncertain, say what is missing.
6. Format your response clearly using markdown.

Conversation mode: fallback (RAG service unavailable).

User's message: ${message}
        `;

        const result = await chat.sendMessage(systemInstruction);
        const responseText = result.response.text();

        res.status(200).json({
            reply: responseText,
            provider: "gemini-fallback",
            ...(ragError && { fallbackReason: ragError.message }),
        });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ error: "Failed to generate AI response. Please try again later." });
    }
}
