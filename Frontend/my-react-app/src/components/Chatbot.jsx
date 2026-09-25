import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

const API = `${API_BASE_URL}/api/chat`;

const ChatProductCard = ({ product }) => {
    const navigate = useNavigate();
    const [imgError, setImgError] = useState(false);

    if (!product || (!product.productId && !product._id) || !product.productName) {
        return null;
    }

    const pId = product.productId || product._id;
    const priceText = (product.minPrice !== null && product.minPrice !== undefined)
        ? `From LKR ${Number(product.minPrice).toLocaleString()}`
        : "Price unavailable";

    const inStock = product.totalStock > 0;

    return (
        <div style={styles.card}>
            <div style={styles.cardImageWrapper}>
                {!imgError && product.image ? (
                    <img
                        src={product.image}
                        alt={product.productName}
                        style={styles.cardImage}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div style={styles.cardPlaceholder}>📦</div>
                )}
            </div>
            <div style={styles.cardContent}>
                <div style={styles.cardTitle} title={product.productName}>
                    {product.productName}
                </div>
                {product.brand && product.brand !== "N/A" && (
                    <div style={styles.cardBrand}>{product.brand}</div>
                )}
                <div style={styles.cardPrice}>{priceText}</div>
                <div style={{ ...styles.cardStock, color: inStock ? "#4ade80" : "#f87171" }}>
                    {inStock ? "✓ In Stock" : "Out of Stock"}
                </div>
                <button
                    onClick={() => navigate(`/products/${pId}`)}
                    style={styles.viewBtn}
                    className="chatbot-card-btn"
                >
                    View Product
                </button>
            </div>
        </div>
    );
};

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "model",
            text: "Hi! I'm your I-Computers AI Assistant powered by LangChain. I can search our catalog in real-time, share YouTube trending electronics, check order status, or help with store policies.",
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    // Auto-scroll logic
    const messagesEndRef = useRef(null);
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const sendUserQuery = async (queryText) => {
        if (!queryText || loading) return;

        const userMsg = { role: "user", text: queryText };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentMessage: queryText,
                    history: messages // Pass earlier messages for context
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to connect to support.");
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "model",
                    text: data.reply,
                    sources: Array.isArray(data.sources) ? data.sources : []
                }
            ]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: "model", text: `Error: ${err.message}` }]);
        } finally {
            setLoading(false);
        }
    };

<<<<<<< HEAD
    const renderProductCards = (sources) => {
        if (!sources || !Array.isArray(sources) || sources.length === 0) return null;

        const validSources = [];
        const seenIds = new Set();

        for (const s of sources) {
            const id = s.productId || s._id;
            if (id && s.productName && !seenIds.has(id)) {
                seenIds.add(id);
                validSources.push(s);
            }
            if (validSources.length >= 5) break;
        }

        if (validSources.length === 0) return null;

        return (
            <div style={styles.cardsContainer} className="chatbot-cards-scroll">
                {validSources.map((product) => (
                    <ChatProductCard key={product.productId || product._id} product={product} />
                ))}
            </div>
        );
    };

=======
    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendUserQuery(input.trim());
    };

    const SUGGESTIONS = [
        "🔥 What's trending on YouTube right now?",
        "🎮 Recommend a high performance gaming laptop",
        "📦 How can I track my order?",
        "🛡️ What is your return & warranty policy?"
    ];

>>>>>>> origin/RAG_FBAUTOMATION
    return (
        <div style={styles.wrapper}>
            {/* ── CHAT WINDOW ── */}
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={styles.avatar}>🤖</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                                    I-Computers Assistant
                                    <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(168,85,247,0.25)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 10, color: "#c084fc", fontWeight: 700 }}>
                                        LangChain ReAct
                                    </span>
                                </h3>
                                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ width: 7, height: 7, background: "#4ade80", borderRadius: "50%", display: "inline-block" }} />
                                    Live Tools Connected
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>✕</button>
                    </div>

                    <div style={styles.messagesBox}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                                marginBottom: 16
                            }}>
                                <div style={{
                                    ...styles.messageBubble,
                                    background: msg.role === "user" ? "linear-gradient(135deg, #006494, #0582ca)" : "rgba(255,255,255,0.08)",
                                    borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                                    borderBottomLeftRadius: msg.role === "model" ? 4 : 16,
                                }}>
                                    {msg.text}
                                </div>
                                {msg.role === "model" && renderProductCards(msg.sources)}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                                <div style={{ ...styles.messageBubble, background: "rgba(255,255,255,0.08)" }}>
                                    <div className="dot-flashing"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick suggestion prompt chips */}
                    <div style={{ padding: "6px 14px", display: "flex", gap: 6, overflowX: "auto", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
                        {SUGGESTIONS.map((sug, i) => (
                            <button
                                key={i}
                                onClick={() => sendUserQuery(sug)}
                                disabled={loading}
                                style={{
                                    whiteSpace: "nowrap",
                                    fontSize: 11,
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    color: "#cbd5e1",
                                    padding: "4px 10px",
                                    borderRadius: 14,
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#a855f7"}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"}
                            >
                                {sug}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSend} style={styles.inputArea}>
                        <input
                            type="text"
                            style={styles.input}
                            placeholder="Ask about products, trends, or policies..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading || !input.trim()} style={styles.sendBtn}>
                            ➤
                        </button>
                    </form>
                </div>
            )}

            {/* ── FLOATING TOGGLE BUTTON ── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={styles.toggleBtn}
                    className="chatbot-toggle-hover"
                >
                    💬
                </button>
            )}

            <style>{`
                @keyframes slideUp { from {opacity:0; transform:translateY(20px) scale(0.95)} to {opacity:1; transform:translateY(0) scale(1)} }
                .chatbot-toggle-hover { transition: transform 0.2s, box-shadow 0.2s; }
                .chatbot-toggle-hover:hover { transform: translateY(-4px) scale(1.05); box-shadow: 0 12px 30px rgba(5,130,202,0.5); }
                
                .chatbot-card-btn { transition: opacity 0.2s, transform 0.15s; }
                .chatbot-card-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                
                .chatbot-cards-scroll::-webkit-scrollbar { height: 6px; }
                .chatbot-cards-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 3px; }
                .chatbot-cards-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
                .chatbot-cards-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }

                .dot-flashing {
                    position: relative; width: 6px; height: 6px; border-radius: 5px; background-color: #4ac6ff; color: #4ac6ff;
                    animation: dot-flashing 1s infinite linear alternate; animation-delay: 0.5s;
                }
                .dot-flashing::before, .dot-flashing::after {
                    content: ''; display: inline-block; position: absolute; top: 0; width: 6px; height: 6px; border-radius: 5px;
                    background-color: #4ac6ff; color: #4ac6ff; animation: dot-flashing 1s infinite alternate;
                }
                .dot-flashing::before { left: -10px; animation-delay: 0s; }
                .dot-flashing::after { left: 10px; animation-delay: 1s; }
                @keyframes dot-flashing { 0% { background-color: #4ac6ff; } 50%, 100% { background-color: rgba(74, 198, 255, 0.2); } }
            `}</style>
        </div>
    );
};

const styles = {
    wrapper: {
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        fontFamily: "'Segoe UI', Arial, sans-serif",
    },
    toggleBtn: {
        width: 60,
        height: 60,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #006494, #0582ca, #a855f7)",
        color: "#fff",
        border: "none",
        fontSize: 28,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    },
    chatWindow: {
        width: 360,
        maxWidth: "calc(100vw - 48px)",
        height: 520,
        maxHeight: "calc(100vh - 48px)",
        background: "rgba(13, 27, 46, 0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
    },
    header: {
        padding: "16px 20px",
        background: "rgba(0,0,0,0.2)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#fff",
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #a855f7, #0582ca)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
    },
    closeBtn: {
        background: "none",
        border: "none",
        color: "#94a3b8",
        fontSize: 20,
        cursor: "pointer",
        padding: 4,
    },
    messagesBox: {
        flex: 1,
        padding: "20px 20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
    },
    messageBubble: {
        maxWidth: "85%",
        padding: "12px 16px",
        borderRadius: 16,
        color: "#fff",
        fontSize: 14,
        lineHeight: 1.5,
        wordWrap: "break-word",
    },
    cardsContainer: {
        display: "flex",
        gap: 10,
        overflowX: "auto",
        padding: "8px 2px 10px 2px",
        marginTop: 6,
        maxWidth: "100%",
        scrollSnapType: "x mandatory",
    },
    card: {
        minWidth: 150,
        maxWidth: 150,
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: 12,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        scrollSnapAlign: "start",
        flexShrink: 0,
    },
    cardImageWrapper: {
        width: "100%",
        height: 85,
        borderRadius: 8,
        overflow: "hidden",
        background: "rgba(0,0,0,0.25)",
        marginBottom: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    cardImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    cardPlaceholder: {
        fontSize: 32,
        color: "#94a3b8",
    },
    cardContent: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: 600,
        color: "#f8fafc",
        marginBottom: 3,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        lineHeight: "1.3",
    },
    cardBrand: {
        fontSize: 11,
        color: "#94a3b8",
        marginBottom: 3,
    },
    cardPrice: {
        fontSize: 11,
        fontWeight: 700,
        color: "#38bdf8",
        marginBottom: 3,
    },
    cardStock: {
        fontSize: 10,
        fontWeight: 500,
        marginBottom: 8,
    },
    viewBtn: {
        width: "100%",
        padding: "6px 0",
        background: "linear-gradient(135deg, #006494, #0582ca)",
        color: "#ffffff",
        border: "none",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        marginTop: "auto",
        textAlign: "center",
    }
};

export default Chatbot;
