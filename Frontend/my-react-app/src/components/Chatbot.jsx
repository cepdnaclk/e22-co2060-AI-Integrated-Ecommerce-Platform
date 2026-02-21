import React, { useState, useEffect, useRef } from "react";

const API = "http://localhost:3000/api/chat";

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "model", text: "Hi! I'm the I-Computers assistant. How can I help you today?" }
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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: "user", text: input.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentMessage: userMsg.text,
                    history: messages // Pass earlier messages for context
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to connect to support.");
            }

            setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: "model", text: `Error: ${err.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.wrapper}>
            {/* ── CHAT WINDOW ── */}
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={styles.avatar}>🤖</div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16 }}>I-Computers Support</h3>
                                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ width: 8, height: 8, background: "#4ade80", borderRadius: "50%", display: "inline-block" }} />
                                    Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>✕</button>
                    </div>

                    <div style={styles.messagesBox}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: "flex",
                                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                marginBottom: 12
                            }}>
                                <div style={{
                                    ...styles.messageBubble,
                                    background: msg.role === "user" ? "linear-gradient(135deg, #006494, #0582ca)" : "rgba(255,255,255,0.08)",
                                    borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                                    borderBottomLeftRadius: msg.role === "model" ? 4 : 16,
                                }}>
                                    {msg.text}
                                </div>
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

                    <form onSubmit={handleSend} style={styles.inputArea}>
                        <input
                            type="text"
                            style={styles.input}
                            placeholder="Type a message..."
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
    inputArea: {
        padding: "16px 20px",
        background: "rgba(0,0,0,0.2)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        gap: 12,
    },
    input: {
        flex: 1,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "999px",
        padding: "10px 16px",
        color: "#fff",
        fontSize: 14,
        outline: "none",
    },
    sendBtn: {
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #006494, #0582ca)",
        color: "#fff",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
    }
};

export default Chatbot;
