import { GoogleGenerativeAI } from "@google/generative-ai";
import { askSupportAgent } from "../services/automationService.js";
import { isRagChatEnabled, requestRagChat } from "../services/ragChatService.js";
import { processMongoDbRagQuery } from "../services/mongodbRagService.js";
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

const ORDERING_PATTERNS = [
    /\b(how (can i|to|do i|does one) order|how does ordering work|ordering process|how to buy|place an order)\b/i,
];

const SHIPPING_PATTERNS = [
    /\b(shipping|delivery|deliver|where do you deliver|how long (for|does) delivery|delivery fee|delivery time|shipping info)\b/i,
];

const RETURNS_PATTERNS = [
    /\b(return|returns|refund|how (do|can) i return|return policy|refund policy|30[- ]day return)\b/i,
];

const OVERVIEW_PATTERNS = [
    /\b(tell me about your products|what products (do you|u) sell|what do (you|u) sell|what kind of products|catalog overview)\b/i,
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
 * Detects if a user message is a product search, recommendation, or catalog query
 * that should be routed to MongoDB Atlas RAG.
 */
function isProductSearchQuery(message = "", history = []) {
    const normalized = message.trim().toLowerCase();

    // Non-product administrative / policy / general question exclusions
    const nonProductExclusions = [
        /\b(how (can i|to|do i|does one) order|how does ordering work|ordering process)\b/i,
        /\b(shipping (time|cost|policy)|how long (for|does) delivery|delivery fee)\b/i,
        /\b(return policy|how to return|refund policy|30[- ]day return)\b/i,
        /\b(what can you do|who are you|help me|what are your features)\b/i
    ];

    for (const excl of nonProductExclusions) {
        if (excl.test(normalized)) return false;
    }

    // Product intent indicators (with optional plural support)
    const productPatterns = [
        /\b(laptops?|notebooks?|macbooks?|zephyrus|g14|g16|xps|pcs?|computers?)\b/i,
        /\b(phones?|smartphones?|mobiles?|galaxys?|iphones?|pixels?)\b/i,
        /\b(keyboards?|mou(se|ce)|headphones?|earbuds?|audio|monitors?|displays?|tvs?)\b/i,
        /\b(clothings?|clothes|apparel|shirts?|t-shirts?|pants?|joggers?|hoodies?|jackets?|wear|shoes|footwear|boots?|sneakers?)\b/i,
        /\b(appliances?|vacuums?|cleaning|dishwashers?|purifiers?|refrigerators?|washers?)\b/i,
        /\b(samsung|apple|razer|asus|nike|dyson|sony|logitech|dell|bosch|miele|irobot|xiaomi|nintendo|jedel|canon|lg|bowflex|marmot|morgan)\b/i,
        /\b(under|below|less than|above|over|between|from)\s+(?:lkr|rs\.?)?\s*\d+/i,
        /\b(in stock|available|currently in stock|unit in stock)\b/i,
        /\b(gaming|game|cleaning|sports)\b/i,
        /\b(show me|looking for|i need|i want|do you have|can i get|recommend|find|search|products?|items?|catalog|store)\b/i
    ];

    if (productPatterns.some((p) => p.test(normalized))) {
        return true;
    }

    // Conversational Follow-up Indicators (enabled when prior product search history exists)
    const followupPatterns = [
        /\b(cheaper|cheapest|cheaper ones)\b/i,
        /\b(which\s+(one|item|model|phone|laptop|keyboard|appliance|product)|which\s+is|which\s+has)\b/i,
        /\b(what\s+about|how\s+about)\b/i,
        /\b(do\s+you\s+have\s+another|another\s+one|more\s+stock|most\s+stock)\b/i,
        /\b(is\s+it|are\s+they)\s+(available|in\s+stock|cheaper)\b/i,
        /\b(how\s+much\s+is\s+it|what('s|\s+is)\s+the\s+price)\b/i
    ];

    const isFollowupPhrase = followupPatterns.some((p) => p.test(normalized));

    if (isFollowupPhrase && Array.isArray(history) && history.length > 0) {
        // Verify that history contains product search intent in user messages
        const hasRecentProductContext = history.some(msg => {
            if (!msg || !msg.text || msg.role !== "user") return false;
            return productPatterns.some(p => p.test(msg.text.toLowerCase()));
        });

        if (hasRecentProductContext) {
            return true;
        }
    }

    return false;
}

/**
 * AI Chatbot Controller (Integrated MongoDB Atlas RAG + Fallback)
 */
export async function handleChatMessage(req, res) {
    const { currentMessage, history = [] } = req.body || {};
    const message = typeof currentMessage === "string" ? currentMessage.trim() : "";

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    // 1. Keep greetings out of retrieval to avoid irrelevant catalog responses.
    if (isGreetingMessage(message)) {
        return res.status(200).json({
            reply: "Hi! I am your I-Computers Weather + Shopping assistant. Ask me about weather-ready product choices, product count, price checks, delivery, or returns.",
            provider: "rule-greeting",
            sources: [],
        });
    }

    // 2. Ordering process inquiry.
    if (ORDERING_PATTERNS.some(p => p.test(message))) {
        return res.status(200).json({
            reply: "Ordering on I-Computers is simple:\n1. Browse or search for products in our store catalog.\n2. Select your desired item and click **Add to Cart**.\n3. Proceed to Checkout, enter your delivery address, and complete payment securely.",
            provider: "rule-ordering",
            sources: []
        });
    }

    // 3. Shipping info inquiry.
    if (SHIPPING_PATTERNS.some(p => p.test(message))) {
        return res.status(200).json({
            reply: "Standard shipping takes **3-5 business days** across Sri Lanka. Express delivery options are available at checkout.",
            provider: "rule-shipping",
            sources: []
        });
    }

    // 4. Return policy inquiry.
    if (RETURNS_PATTERNS.some(p => p.test(message))) {
        return res.status(200).json({
            reply: "We offer a **30-day return policy** for unused items in original packaging. Contact customer support to initiate a return.",
            provider: "rule-returns",
            sources: []
        });
    }

    // 5. Store overview inquiry.
    if (OVERVIEW_PATTERNS.some(p => p.test(message))) {
        return res.status(200).json({
            reply: "I-Computers offers a wide selection of electronics (laptops, gaming keyboards, smartphones, audio), home appliances, books, fashion, and sports apparel.",
            provider: "rule-overview",
            sources: []
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

    // 2. Direct database answer for stock-size questions.
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

    // 3. Direct database answer for "what are the prices of them/latest products".
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

    // 4. Direct database answer for "latest/new products" questions.
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

    // 5. MONGODB ATLAS VECTOR SEARCH RAG (Primary Product Retrieval Path)
    const isProductSearch = isProductSearchQuery(message, normalizedHistory);

    if (isProductSearch) {
        console.log(`[CHAT ROUTE] message="${message}"`);
        console.log(`[CHAT ROUTE] classification=PRODUCT_SEARCH`);
        console.log(`[CHAT ROUTE] handler=MONGODB_RAG`);

        try {
            const ragResult = await processMongoDbRagQuery(message, { history: normalizedHistory });
            if (ragResult && ragResult.success) {
                return res.status(200).json({
                    reply: ragResult.answer,
                    provider: "mongodb-atlas-rag",
                    sources: ragResult.sources || [],
                    matchType: ragResult.matchType
                });
            } else {
                console.error("[CHAT ROUTE] MONGODB_RAG returned unsuccessful result:", ragResult);
            }
        } catch (atlasRagErr) {
            console.error("[CHAT ROUTE] MONGODB_RAG Error:", atlasRagErr.message);
        }
    } else {
        console.log(`[CHAT ROUTE] message="${message}"`);
        console.log(`[CHAT ROUTE] classification=GENERAL`);
        console.log(`[CHAT ROUTE] handler=LEGACY_RAG`);
    }

    // 6. Legacy Python / ChromaDB RAG (Fallback Path if RAG enabled)
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
            console.error("Legacy RAG Chat Error:", error.message);
        }
    }

    // 7. General Gemini LLM Fallback (for non-product inquiries)
    try {
        // 1️⃣ Try tool-augmented LangChain Support Agent first
        try {
            const agentResponse = await askSupportAgent(message, normalizedHistory);
            if (agentResponse && agentResponse.reply) {
                return res.status(200).json({ reply: agentResponse.reply, provider: "langchain-agent" });
            }
        } catch (agentError) {
            console.warn("⚠️ LangChain agent unreachable or failed, trying direct LLM fallback:", agentError.message);
        }

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

        // 2️⃣ Fallback: direct Gemini LLM chat session
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
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
2. If asked about shipping, say standard shipping is 3-5 business days.
3. If asked about returns, mention our 30-day return policy.
4. If asked how ordering works, explain that customers can select items, add to cart, and checkout securely.
5. If answer is uncertain, say what is missing.
6. Format your response clearly using markdown.

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

