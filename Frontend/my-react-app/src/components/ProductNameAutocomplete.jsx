import React, { useState, useEffect, useRef } from "react";
import API_BASE_URL from "../config/api";

/**
 * ProductNameAutocomplete
 *
 * Props:
 *  value        {string}   – controlled value of the product name field
 *  onChange     {fn}       – called with (newValue: string) on every keystroke
 *  onSelect     {fn}       – called with (selectedName: string) when a suggestion is chosen
 *  inputStyle   {object}   – inline styles for the <input>
 *  labelStyle   {object}   – inline styles for the <label>
 *  disabled     {bool}     – disables the input while AI is processing
 */
export default function ProductNameAutocomplete({
  value,
  onChange,
  onSelect,
  inputStyle = {},
  labelStyle = {},
  disabled = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [errorMsg, setErrorMsg] = useState("");

  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setErrorMsg("");
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setErrorMsg("");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsFetching(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/product-suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: value.trim() }),
        });
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || "AI service unavailable");
          setSuggestions([]);
          setShowDropdown(true);
          return;
        }

        const list = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setShowDropdown(list.length > 0);
        setActiveIndex(-1);
      } catch {
        setErrorMsg("Cannot reach AI service");
        setSuggestions([]);
        setShowDropdown(true);
      } finally {
        setIsFetching(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const handleSelect = (name) => {
    setShowDropdown(false);
    setSuggestions([]);
    onChange(name);
    onSelect(name);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label style={labelStyle}>Product Name *</label>
      <div style={{ position: "relative" }}>
        <input
          required
          className="cp-input"
          style={inputStyle}
          name="productName"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Apple iPhone 15 Pro Max"
          autoComplete="off"
          disabled={disabled}
        />

        {/* Spinner while fetching */}
        {isFetching && (
          <div
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#64748b",
              fontSize: 12,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,0.15)",
                borderTopColor: "#0582ca",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }}
            />
            <span>Searching…</span>
          </div>
        )}
      </div>

      {/* Error message dropdown */}
      {showDropdown && errorMsg && suggestions.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 2000,
            background: "rgba(30,10,10,0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10,
            padding: "12px 16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: "#f87171", fontSize: 14 }}>⚠</span>
          <span style={{ color: "#fca5a5", fontSize: 13 }}>{errorMsg}</span>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 2000,
            background: "rgba(5,11,46,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(5,130,202,0.4)",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "8px 14px 6px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 13, color: "#0582ca" }}>✦</span>
            <span
              style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              AI Suggestions
            </span>
          </div>

          {/* Suggestion Items */}
          {suggestions.map((name, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(name)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                fontSize: 14,
                color: activeIndex === i ? "#fff" : "#cbd5e1",
                background:
                  activeIndex === i
                    ? "rgba(5,130,202,0.22)"
                    : "transparent",
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                transition: "background 0.12s, color 0.12s",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(5,130,202,0.15)";
                e.currentTarget.style.color = "#fff";
                setActiveIndex(i);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  activeIndex === i
                    ? "rgba(5,130,202,0.22)"
                    : "transparent";
              }}
            >
              <span style={{ color: "#0582ca", fontSize: 12, flexShrink: 0 }}>
                ⟡
              </span>
              <span>{name}</span>
            </div>
          ))}

          {/* Footer hint */}
          <div
            style={{
              padding: "6px 14px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              fontSize: 11,
              color: "#475569",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>↑↓ navigate</span>
            <span>↵ select · Esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
