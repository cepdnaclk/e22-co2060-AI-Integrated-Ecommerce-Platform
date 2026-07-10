import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Filter, Search, X, Check, RefreshCw, Mail } from "lucide-react";
import CustomerNavbar from "../components/CustomerNavbar";
import CustomerFooter from "../components/CustomerFooter";
import Reveal from "../components/Reveal";
import DealBanner from "../components/deals/DealBanner";
import DealGrid from "../components/deals/DealGrid";
import CountdownTimer from "../components/deals/CountdownTimer";
import CategoryFilter from "../components/deals/CategoryFilter";
import { fetchDeals } from "../services/productService";

// ── Helpers ───────────────────────────────────────────────────────────────
function getEndOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

const SORT_OPTIONS = [
  { value: "discount_desc", label: "Biggest Discount" },
  { value: "savings_desc",  label: "Most Savings" },
  { value: "price_asc",    label: "Price: Low to High" },
  { value: "price_desc",   label: "Price: High to Low" },
  { value: "newest",       label: "Newest First" },
];

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ toast, onCartClick }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 backdrop-blur-xl border px-6 py-4 rounded-2xl shadow-2xl ${
            toast.success
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {toast.success ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="font-medium text-sm">{toast.message}</span>
          {toast.success && (
            <button
              onClick={onCartClick}
              className="ml-2 text-xs bg-green-500/20 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-bold border border-green-500/40 transition"
            >
              View Cart
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function Deals() {
  const navigate = useNavigate();

  // Data
  const [deals, setDeals]           = useState([]);
  const [totalDeals, setTotalDeals] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Filters
  const [category,    setCategory]    = useState("All");
  const [sort,        setSort]        = useState("discount_desc");
  const [minDiscount, setMinDiscount] = useState(0);
  const [maxPrice,    setMaxPrice]    = useState(600000);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);

  // UI
  const [wishlist,     setWishlist]     = useState([]);
  const [toast,        setToast]        = useState(null);
  const [showFilters,  setShowFilters]  = useState(false);
  const [emailInput,   setEmailInput]   = useState("");

  const gridRef = useRef(null);
  const toastTimer = useRef(null);

  // ── Fetch deals from real API ──────────────────────────────────────────
  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDeals({ page, limit: 12, category, sort, minDiscount });
      setDeals(res.deals ?? []);
      setTotalDeals(res.totalDeals ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, category, sort, minDiscount]);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  // ── Toast helper ───────────────────────────────────────────────────────
  const showToast = useCallback((message, success = true) => {
    clearTimeout(toastTimer.current);
    setToast({ message, success });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // ── Wishlist toggle (local — no duplicate wishlist system) ─────────────
  const handleWishlist = useCallback((productId, name) => {
    setWishlist(prev => {
      const has = prev.includes(productId);
      showToast(has ? `Removed from Wishlist` : `✓ Saved "${name}" to Wishlist`, true);
      return has ? prev.filter(id => id !== productId) : [...prev, productId];
    });
  }, [showToast]);

  // ── Reset all filters ──────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setCategory("All");
    setSort("discount_desc");
    setMinDiscount(0);
    setMaxPrice(600000);
    setSearch("");
    setPage(1);
  }, []);

  // ── Client-side search filter on top of server-filtered results ────────
  const displayedDeals = search.trim()
    ? deals.filter(d =>
        d.product.productName.toLowerCase().includes(search.toLowerCase()) ||
        (d.product.brand || "").toLowerCase().includes(search.toLowerCase())
      )
    : deals;

  // ── Client-side max-price filter ───────────────────────────────────────
  const priceFiltered = displayedDeals.filter(d => d.offer.finalPrice <= maxPrice);

  // Featured deal = highest discount
  const featuredDeal = [...deals].sort((a, b) => b.offer.discountPercentage - a.offer.discountPercentage)[0];

  return (
    <div className="min-h-screen smooth-bg text-white font-sans overflow-x-hidden">
      <CustomerNavbar />
      <Toast toast={toast} onCartClick={() => navigate("/cart")} />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-[62vh] flex flex-col items-center justify-center text-center px-4 md:px-10 py-16 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="max-w-4xl mx-auto z-10 space-y-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" />
              AI-Curated Deals
            </div>
          </Reveal>

          <Reveal delay={150}>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
              Today's Best Deals
            </h1>
          </Reveal>

          <Reveal delay={280}>
            <p className="text-lg md:text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
              Exclusive discounts on real products from verified sellers — dynamically calculated and updated every day.
            </p>
          </Reveal>

          <Reveal delay={420}>
            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Offers Reset In</span>
              <CountdownTimer targetDate={getEndOfDay()} label="" />
            </div>
          </Reveal>

          <Reveal delay={550}>
            <div className="flex items-center gap-4 justify-center flex-wrap text-sm text-gray-400 mt-2">
              {!loading && (
                <span className="bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                  🏷️ <strong className="text-white">{totalDeals}</strong> active deals
                </span>
              )}
              <button
                onClick={() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-2xl transition-all transform hover:scale-105 shadow-[0_4px_25px_rgba(37,99,235,0.3)] border border-cyan-400/30"
              >
                Explore Deals →
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURED DEAL BANNER ─────────────────────────────────────── */}
      {(loading || featuredDeal) && (
        <section className="max-w-7xl mx-auto px-4 md:px-10 py-10">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2">
              🏆 Featured Deal of the Day
            </h2>
          </Reveal>

          <Reveal delay={150}>
            {loading ? (
              <div className="rounded-[32px] border border-white/10 glass-morphism p-10 animate-pulse h-64 flex items-center justify-center">
                <span className="text-gray-500">Loading featured deal…</span>
              </div>
            ) : featuredDeal ? (
              <DealBanner deal={featuredDeal} />
            ) : null}
          </Reveal>
        </section>
      )}

      {/* ── CATEGORY FILTER + DEALS GRID ─────────────────────────────── */}
      <section
        ref={gridRef}
        className="max-w-7xl mx-auto px-4 md:px-10 py-10 scroll-mt-24"
      >
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-extrabold">Trending Deals</h2>
            <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              {loading ? "Loading…" : `${totalDeals} deal${totalDeals !== 1 ? "s" : ""} found`}
            </span>
          </div>
        </Reveal>

        {/* Category pills */}
        <Reveal delay={100}>
          <div className="mb-6">
            <CategoryFilter
              selected={category}
              onSelect={(cat) => { setCategory(cat); setPage(1); }}
            />
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── Sidebar Filters ───────────────────────────────────────── */}
          <aside className="hidden lg:flex lg:col-span-1 flex-col gap-6 self-start sticky top-24">
            <div className="glass-morphism rounded-3xl p-6 border border-white/10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="font-bold text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-400" />
                  Filters
                </span>
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              </div>

              {/* Min Discount */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-extrabold block">Min Discount</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 15, 25, 40].map(pct => (
                    <button
                      key={pct}
                      onClick={() => { setMinDiscount(pct); setPage(1); }}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        minDiscount === pct
                          ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {pct === 0 ? "Any" : `${pct}%+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Price */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="uppercase tracking-wider font-extrabold">Max Price</span>
                  <span className="font-bold text-white font-mono">Rs. {maxPrice.toLocaleString()}</span>
                </div>
                <input
                  type="range" min={10000} max={600000} step={5000}
                  value={maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>Rs. 10,000</span>
                  <span>Rs. 600,000</span>
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-extrabold block">Sort By</label>
                <div className="space-y-1.5">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSort(opt.value); setPage(1); }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                        sort === opt.value
                          ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main content area ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Search + mobile filter toggle */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search deals by name or brand…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-3.5 text-sm text-white focus:outline-none focus:border-blue-400 transition"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(p => !p)}
                className="lg:hidden px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-2 font-bold transition"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="lg:hidden overflow-hidden glass-morphism rounded-2xl border border-white/10 p-5 space-y-4"
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 15, 25, 40].map(pct => (
                      <button
                        key={pct}
                        onClick={() => { setMinDiscount(pct); setPage(1); }}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          minDiscount === pct
                            ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        {pct === 0 ? "Any" : `${pct}%+`}
                      </button>
                    ))}
                  </div>
                  <select
                    value={sort}
                    onChange={e => { setSort(e.target.value); setPage(1); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none"
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error state */}
            {error && !loading && (
              <div className="glass-morphism rounded-2xl border border-red-500/20 p-6 text-center text-red-400 space-y-3">
                <p className="font-bold">Failed to load deals: {error}</p>
                <button onClick={loadDeals} className="text-sm bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl border border-red-500/20 transition">
                  Retry
                </button>
              </div>
            )}

            {/* Deals grid */}
            {!error && (
              <DealGrid
                deals={priceFiltered}
                loading={loading}
                wishlist={wishlist}
                onToast={showToast}
                onWishlist={handleWishlist}
                onReset={resetFilters}
              />
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); gridRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                    className={`w-9 h-9 rounded-lg border text-sm font-bold transition ${
                      page === p
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 md:px-10 py-16">
        <Reveal>
          <div className="glass-morphism border border-white/10 rounded-[40px] p-8 md:p-16 relative overflow-hidden text-center shadow-2xl group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="max-w-xl mx-auto space-y-5 relative z-10">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center mx-auto text-2xl group-hover:scale-110 transition-transform">
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold">Never miss a deal.</h2>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Get daily alerts for the best discounts added by verified BEETA sellers.
              </p>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  showToast("✓ Subscribed! You'll get daily deal alerts.");
                  setEmailInput("");
                }}
                className="flex flex-col sm:flex-row gap-3 pt-2"
              >
                <input
                  type="email" required
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-400 transition"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition shadow-lg border border-blue-500/40 whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </Reveal>
      </section>

      <CustomerFooter />
    </div>
  );
}
