import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchProducts } from "../services/productService";
import { smartSearch } from "../services/sellerOfferService";
import SmartSearchBar from "../components/SmartSearchBar";
import FilterSidebar from "../components/FilterSidebar";
import ProductGrid from "../components/ProductGrid";

/* ─── Unified result card for smart-search hits ─── */
function SearchResultCard({ item }) {
  const product = item.product || {};
  const displayImage = item.image || product.image;
  const displayName = item.type === "variant"
    ? `${product.productName} – ${item.variantName}`
    : product.productName;

  const cheapest = item.offers?.[0];
  const discountedPrice = cheapest?.discountPercentage > 0
    ? cheapest.price * (1 - cheapest.discountPercentage / 100)
    : cheapest?.price;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: "16px",
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
      cursor: "default",
      position: "relative",
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(5,130,202,0.15)";
        e.currentTarget.style.borderColor = "rgba(5,130,202,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      {/* Badge: Variant vs Product */}
      {item.type === "variant" && (
        <span style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700,
          color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.06em",
        }}>Variant</span>
      )}

      {/* Image */}
      <img
        src={displayImage}
        alt={displayName}
        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, background: "#1e293b", flexShrink: 0 }}
        onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%231e293b'%3E%3Crect width='80' height='80' rx='10'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='28'%3E📦%3C/text%3E%3C/svg%3E"; }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 4, paddingRight: item.type === "variant" ? 72 : 0 }}>
          {displayName}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          {product.category && <span style={{ fontSize: 11, color: "#64748b" }}>📂 {product.category}</span>}
          {product.brand && <span style={{ fontSize: 11, color: "#64748b" }}>🏷️ {product.brand}</span>}
          {item.color && <span style={{ fontSize: 11, color: "#94a3b8" }}>🎨 {item.color}</span>}
          {item.storage && <span style={{ fontSize: 11, color: "#94a3b8" }}>💾 {item.storage}</span>}
        </div>

        {/* Price + offers */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {discountedPrice != null ? (
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#4ade80" }}>
                Rs. {discountedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {cheapest?.discountPercentage > 0 && (
                <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 6, fontWeight: 600 }}>
                  -{cheapest.discountPercentage}%
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: "#64748b" }}>No offers yet</span>
          )}

          {item.sellerCount > 0 && (
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              🏪 {item.sellerCount} seller{item.sellerCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ flexShrink: 0 }}>
        <Link
          to={`/products/${product._id}`}
          style={{
            display: "inline-block",
            background: "linear-gradient(to right, #006494, #0582ca)",
            color: "#fff", fontWeight: 600, fontSize: 13,
            padding: "8px 16px", borderRadius: 9, textDecoration: "none",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Compare →
        </Link>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ search }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#e2e8f0" }}>No results for "{search}"</h3>
      <p style={{ color: "#64748b", fontSize: 14 }}>Try different keywords or check your spelling.</p>
    </div>
  );
}

/* ─── Loading Skeleton ─── */
function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14, padding: 16, display: "flex", gap: 16, alignItems: "center",
          animation: "pulse 1.5s ease-in-out infinite",
        }}>
          <div style={{ width: 80, height: 80, borderRadius: 10, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: "60%", background: "rgba(255,255,255,0.06)", borderRadius: 6, marginBottom: 10 }} />
            <div style={{ height: 11, width: "40%", background: "rgba(255,255,255,0.04)", borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 16, width: "25%", background: "rgba(255,255,255,0.06)", borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
const ProductListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");
  const urlSearch = searchParams.get("q");

  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  const [search, setSearch] = useState(urlSearch || "");
  const [category, setCategory] = useState(urlCategory || null);
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Sync state with URL when URL changes
  useEffect(() => {
    if (urlCategory !== category) setCategory(urlCategory);
    if (urlSearch !== search) setSearch(urlSearch || "");
  }, [urlCategory, urlSearch]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (search.trim()) {
        // 🧠 SMART SEARCH MODE
        const data = await smartSearch({ q: search.trim(), category, sort, page, limit: 12 });
        setSearchResults(data.results || []);
        setProducts([]);
        setTotalResults(data.total || 0);
        setTotalPages(data.pages || 0);
      } else {
        // 📦 BROWSE MODE
        const data = await fetchProducts({ category, sort, page, limit: 12 });
        setProducts(data.products || []);
        setSearchResults([]);
        setTotalResults(data.totalProducts || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch (err) {
      console.error("❌", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [search, category, sort, page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    if (val) {
      searchParams.set("q", val);
    } else {
      searchParams.delete("q");
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050B2E] via-[#081A4A] to-[#020617] text-white px-6 py-6">
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          {search ? `Results for "${search}"` : "Browse Products"}
        </h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>
          {search
            ? "Smart search across all products, variants and seller offers"
            : "Compare prices from multiple sellers"}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-5">

        {/* Sidebar */}
        <FilterSidebar
          setSearch={() => { }}   // SmartSearchBar handles this now
          setCategory={(val) => {
            setCategory(val);
            setPage(1);
            if (val) {
              searchParams.set("category", val);
            } else {
              searchParams.delete("category");
            }
            setSearchParams(searchParams);
          }}
        />

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Smart Search Bar */}
          <div style={{ marginBottom: 16 }}>
            <SmartSearchBar onSearch={handleSearch} />
          </div>

          {/* Sort / count bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16, background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "10px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Sort by</span>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "4px 10px", fontSize: 13, color: "#e2e8f0", outline: "none",
                }}
              >
                <option value="latest">Latest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>

            <span style={{ fontSize: 13, color: "#64748b" }}>
              {loading ? "Searching…" : `${totalResults} result${totalResults !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Results */}
          {loading && <Skeleton />}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: 40, color: "#f87171" }}>{error}</div>
          )}

          {!loading && !error && (
            <>
              {/* SEARCH MODE */}
              {search && (
                <>
                  {searchResults.length === 0 ? (
                    <EmptyState search={search} />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {searchResults.map((item, i) => (
                        <SearchResultCard
                          key={item.variantId || item.product?._id || i}
                          item={item}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* BROWSE MODE */}
              {!search && <ProductGrid products={products} loading={loading} error={error} />}
            </>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 32 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                    background: page === p ? "linear-gradient(to right,#006494,#0582ca)" : "rgba(255,255,255,0.06)",
                    color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14,
                  }}
                >{p}</button>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ProductListing;