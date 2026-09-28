import React, { useState, useEffect, useRef } from "react";
import { getAutocomplete } from "../services/sellerOfferService";

/**
 * SmartSearchBar
 * ─────────────
 * • Debounced input (300 ms)
 * • Calls Gemini AI autocomplete after 2 chars
 * • Shows dropdown of corrected / expanded suggestions
 * • On select or Enter → triggers onSearch callback
 */
export default function SmartSearchBar({ onSearch, initialValue = "" }) {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const autocompleteTimer = useRef(null);
    const searchTimer = useRef(null);
    const containerRef = useRef(null);

    /* ── Close dropdown on outside click ── */
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* ── Debounced search trigger + AI autocomplete ── */
    useEffect(() => {
        clearTimeout(searchTimer.current);
        clearTimeout(autocompleteTimer.current);

        // Trigger the parent search after 400 ms
        searchTimer.current = setTimeout(() => {
            onSearch(query.trim());
        }, 400);

        // Fetch autocomplete after 300 ms if query is long enough
        if (query.trim().length >= 2) {
            autocompleteTimer.current = setTimeout(async () => {
                setLoadingSuggestions(true);
                const sug = await getAutocomplete(query.trim());
                setSuggestions(sug);
                setShowDropdown(sug.length > 0);
                setLoadingSuggestions(false);
            }, 300);
        } else {
            setSuggestions([]);
            setShowDropdown(false);
        }

        return () => {
            clearTimeout(searchTimer.current);
            clearTimeout(autocompleteTimer.current);
        };
    }, [query]);

    const selectSuggestion = (sug) => {
        setQuery(sug);
        setShowDropdown(false);
        setActiveSuggestion(-1);
        onSearch(sug);
    };

    const handleKeyDown = (e) => {
        if (!showDropdown || suggestions.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveSuggestion((p) => (p + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveSuggestion((p) => (p <= 0 ? suggestions.length - 1 : p - 1));
        } else if (e.key === "Enter") {
            if (activeSuggestion >= 0) {
                e.preventDefault();
                selectSuggestion(suggestions[activeSuggestion]);
            } else {
                setShowDropdown(false);
            }
        } else if (e.key === "Escape") {
            setShowDropdown(false);
            setActiveSuggestion(-1);
        }
    };

    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
            <style>{`
        .ssb-input:focus { border-color: #0582ca !important; box-shadow: 0 0 0 3px rgba(5,130,202,0.15); }
        .ssb-item { transition: background 0.12s; }
        .ssb-item:hover, .ssb-item.active { background: rgba(5,130,202,0.15) !important; }
        @keyframes ssb-fade { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

            {/* Input */}
            <div style={{ position: "relative" }}>
                <span style={{
                    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                    fontSize: 16, pointerEvents: "none", opacity: 0.5,
                }}>🔍</span>

                <input
                    className="ssb-input"
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActiveSuggestion(-1); }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    placeholder="Search products, variants, brands…"
                    autoComplete="off"
                    style={{
                        width: "100%",
                        padding: "11px 40px 11px 40px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                />

                {/* Loading spinner / clear button */}
                {loadingSuggestions ? (
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#4ac6ff" }}>
                        <span style={{
                            display: "inline-block", width: 14, height: 14,
                            border: "2px solid rgba(74,198,255,0.3)", borderTop: "2px solid #4ac6ff",
                            borderRadius: "50%", animation: "spin 0.8s linear infinite",
                        }} />
                    </span>
                ) : query ? (
                    <button
                        onClick={() => { setQuery(""); setSuggestions([]); setShowDropdown(false); onSearch(""); }}
                        style={{
                            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", color: "#64748b", cursor: "pointer",
                            fontSize: 16, lineHeight: 1, padding: 2,
                        }}
                    >✕</button>
                ) : null}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
                <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 200,
                    background: "linear-gradient(135deg, #0d1b38, #091429)",
                    border: "1px solid rgba(5,130,202,0.25)", borderRadius: 12,
                    backdropFilter: "blur(16px)", overflow: "hidden",
                    animation: "ssb-fade 0.15s ease forwards",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                }}>
                    <div style={{ padding: "8px 14px 4px", fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        🤖 AI Suggestions
                    </div>
                    {suggestions.map((sug, i) => (
                        <div
                            key={sug}
                            className={`ssb-item ${i === activeSuggestion ? "active" : ""}`}
                            onMouseDown={() => selectSuggestion(sug)}
                            style={{
                                padding: "11px 16px",
                                cursor: "pointer",
                                fontSize: 14,
                                color: i === activeSuggestion ? "#4ac6ff" : "#e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                                background: i === activeSuggestion ? "rgba(5,130,202,0.15)" : "transparent",
                            }}
                        >
                            <span style={{ opacity: 0.4, fontSize: 12 }}>🔍</span>
                            <span>{sug}</span>
                            {i === activeSuggestion && (
                                <span style={{ marginLeft: "auto", fontSize: 10, color: "#4ac6ff", opacity: 0.7 }}>↵ select</span>
                            )}
                        </div>
                    ))}
                    <div style={{ padding: "6px 14px 8px", fontSize: 10, color: "#334155", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        powered by Gemini AI
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
