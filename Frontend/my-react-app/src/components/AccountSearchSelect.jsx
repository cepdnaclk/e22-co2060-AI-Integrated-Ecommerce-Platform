import React, { useEffect, useRef, useState } from "react";
import { searchChartAccounts } from "../services/bookkeepingService";

const formatAccountLabel = (account) => {
  if (!account) return "";
  return `${account.code} - ${account.name} (${account.type})`;
};

export default function AccountSearchSelect({
  selectedAccount,
  onSelect,
  placeholder = "Search account code or name",
  typeFilter = "",
  disabled = false
}) {
  const [query, setQuery] = useState(formatAccountLabel(selectedAccount));
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const searchTokenRef = useRef(0);

  useEffect(() => {
    setQuery(formatAccountLabel(selectedAccount));
  }, [selectedAccount]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const triggerSearch = async (nextQuery) => {
    setLoading(true);
    setError("");
    const token = searchTokenRef.current + 1;
    searchTokenRef.current = token;
    try {
      const result = await searchChartAccounts({
        query: nextQuery.trim(),
        type: typeFilter,
        limit: 15
      });
      if (searchTokenRef.current !== token) return;
      setOptions(result.accounts ?? []);
      setOpen(true);
    } catch (searchError) {
      if (searchTokenRef.current !== token) return;
      setOptions([]);
      setError(searchError.message);
      setOpen(true);
    } finally {
      if (searchTokenRef.current === token) {
        setLoading(false);
      }
    }
  };

  const onQueryChange = (nextValue) => {
    setQuery(nextValue);
    onSelect(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      triggerSearch(nextValue);
    }, 220);
  };

  const handleSelect = (account) => {
    setQuery(formatAccountLabel(account));
    setOpen(false);
    setOptions([]);
    setError("");
    onSelect(account);
  };

  return (
    <div ref={containerRef} style={S.container}>
      <div style={S.inputWrap}>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => {
            if (!open) {
              triggerSearch(query);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={S.input}
          autoComplete="off"
        />
        {loading ? <span style={S.status}>Searching...</span> : null}
      </div>

      {open ? (
        <div style={S.dropdown}>
          {error ? <div style={S.error}>{error}</div> : null}
          {!error && options.length === 0 ? (
            <div style={S.empty}>No matching accounts</div>
          ) : null}
          {!error &&
            options.map((account) => (
              <button
                key={`${account.code}-${account.type}`}
                type="button"
                style={S.option}
                onMouseDown={() => handleSelect(account)}
              >
                <span style={S.optionCode}>{account.code}</span>
                <span style={S.optionName}>{account.name}</span>
                <span style={S.optionType}>{account.type}</span>
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

const S = {
  container: {
    position: "relative",
    width: "100%"
  },
  inputWrap: {
    position: "relative"
  },
  input: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#e2e8f0",
    padding: "10px 12px",
    fontSize: "13px"
  },
  status: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#93c5fd",
    fontSize: "11px"
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    zIndex: 30,
    background: "rgba(2, 6, 23, 0.96)",
    border: "1px solid rgba(148,163,184,0.35)",
    borderRadius: "10px",
    maxHeight: "230px",
    overflowY: "auto",
    boxShadow: "0 12px 28px rgba(2, 6, 23, 0.45)"
  },
  option: {
    width: "100%",
    border: "none",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
    background: "transparent",
    color: "#e2e8f0",
    textAlign: "left",
    padding: "8px 10px",
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "78px 1fr auto",
    gap: "10px",
    alignItems: "center"
  },
  optionCode: {
    fontFamily: "'Courier New', Courier, monospace",
    color: "#93c5fd",
    fontWeight: 700,
    fontSize: "12px"
  },
  optionName: {
    fontSize: "12px"
  },
  optionType: {
    fontSize: "10px",
    border: "1px solid rgba(147,197,253,0.35)",
    borderRadius: "999px",
    padding: "2px 8px",
    color: "#dbeafe",
    whiteSpace: "nowrap"
  },
  error: {
    padding: "10px",
    color: "#fca5a5",
    fontSize: "12px"
  },
  empty: {
    padding: "10px",
    color: "#94a3b8",
    fontSize: "12px"
  }
};

