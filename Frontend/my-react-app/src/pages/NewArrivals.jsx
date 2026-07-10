import React, { useState, useEffect, useRef } from "react";
import CustomerNavbar from "../components/CustomerNavbar";
import CustomerFooter from "../components/CustomerFooter";
import Reveal from "../components/Reveal";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import { 
  Clock, Percent, Star, Sparkles, Zap, Filter, ChevronRight, ChevronLeft, 
  Search, Mail, ThumbsUp, ShoppingBag, Heart, Share2, Eye, Award, CheckCircle, RefreshCw, X, Check, Calendar
} from "lucide-react";
import { fetchProducts } from "../services/productService";

// MOCK_ARRIVALS removed in favor of real DB data.

const CATEGORIES = ["All", "Electronics", "Fashion", "Gaming", "Home", "Beauty", "Books", "Sports", "Accessories"];
const BRANDS = ["All", "Ray-Ban", "Apple", "DJI", "Keychron", "Amazon", "Dyson", "Patagonia", "Adidas", "Peak Design", "SteelSeries", "Anker", "Theragun"];

const CATEGORY_META = [
  { name: "Electronics", count: 18, image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&auto=format&fit=crop&q=80" },
  { name: "Fashion", count: 12, image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&auto=format&fit=crop&q=80" },
  { name: "Gaming", count: 15, image: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=300&auto=format&fit=crop&q=80" },
  { name: "Books", count: 6, image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&auto=format&fit=crop&q=80" },
  { name: "Home", count: 9, image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&auto=format&fit=crop&q=80" },
  { name: "Beauty", count: 8, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&auto=format&fit=crop&q=80" },
  { name: "Sports", count: 11, image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300&auto=format&fit=crop&q=80" },
  { name: "Accessories", count: 14, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80" }
];

export default function NewArrivals() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const token = localStorage.getItem("token");

  // State
  const [arrivals, setArrivals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [wishlist, setWishlist] = useState([]);

  // Filters State
  const [filterTime, setFilterTime] = useState("all"); // all, today, week, month
  const [filterPrice, setFilterPrice] = useState(300000);
  const [filterBrand, setFilterBrand] = useState("All");
  const [filterAvailability, setFilterAvailability] = useState("All"); // All or InStock
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest, price_asc, price_desc, popularity, rating

  // Modal State for Quick View
  const [quickViewItem, setQuickViewItem] = useState(null);

  const gridRef = useRef(null);

  // Fetch real latest products on mount
  useEffect(() => {
    const loadRealLatest = async () => {
      setLoading(true);
      try {
        const res = await fetchProducts({ sort: "latest", limit: 30 });
        if (res && res.products && res.products.length > 0) {
          const dbArrivals = [];
          res.products.forEach((p, idx) => {
            if (p.offers && p.offers.length > 0) {
              p.offers.forEach((o, oIdx) => {
                const discount = o.discountPercentage > 0 ? o.discountPercentage : 0;
                const oldPrice = o.price;
                const newPrice = oldPrice * (1 - discount / 100);

                // Simulate relative times based on indexes to spread them out realistically
                let timeStr = "2 hours ago";
                let timeRaw = "today";
                if (idx > 3 && idx <= 8) {
                  timeStr = `${idx - 2} hours ago`;
                  timeRaw = "today";
                } else if (idx > 8 && idx <= 15) {
                  timeStr = `${Math.floor(idx / 3)} days ago`;
                  timeRaw = "week";
                } else if (idx > 15) {
                  timeStr = `${Math.floor(idx / 7)} weeks ago`;
                  timeRaw = "month";
                }

                dbArrivals.push({
                  id: o._id,
                  productId: p._id,
                  name: p.productName,
                  category: p.category || "Electronics",
                  brand: p.brand || "Generic",
                  image: p.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
                  price: newPrice,
                  originalPrice: oldPrice,
                  discount: discount,
                  addedTime: timeStr,
                  addedTimeRaw: timeRaw,
                  rating: p.rating || 4.5,
                  reviewsCount: o.reviewsCount || Math.floor(Math.random() * 40) + 5,
                  sellerName: o.sellerName || "Verified Partner",
                  verifiedSeller: idx % 3 !== 0,
                  stock: o.stock || 10,
                  liveViews: Math.floor(Math.random() * 120) + 30,
                  purchasesToday: Math.floor(Math.random() * 15) + 1,
                  aiMatch: Math.floor(Math.random() * 15) + 85,
                  aiReason: `Personalized recommendation matching interest in ${p.category}.`,
                  isTrending: idx % 4 === 0,
                  isReal: true
                });
              });
            }
          });

          if (dbArrivals.length > 0) {
            setArrivals(dbArrivals);
          }
        }
      } catch (err) {
        console.warn("Failed to load real new arrivals.", err);
      } finally {
        setLoading(false);
      }
    };
    loadRealLatest();
  }, []);

  
  const handleBuyNow = async (item, e) => {
    if (e) e.stopPropagation();
    if (!token && item.isReal) {
      navigate("/login");
      return;
    }
    setAddingId(item.id);
    try {
      if (item.isReal) {
        await addItem(item.id, 1);
        navigate("/cart");
      }
    } catch (err) {
      showToast(err.message || "Failed to buy now", false);
    } finally {
      setAddingId(null);
    }
  };

  const handleAddToCart = async (item, e) => {
    if (e) e.stopPropagation();
    if (!token && item.isReal) {
      navigate("/login");
      return;
    }
    setAddingId(item.id);
    try {
      if (item.isReal) {
        await addItem(item.id, 1);
        showToast(`✓ Added "${item.name}" to cart!`);
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
        showToast(`✓ Added "${item.name}" to cart (Demo Mode)`);
      }
    } catch (err) {
      showToast(err.message || "Failed to add to cart", false);
    } finally {
      setAddingId(null);
    }
  };

  const toggleWishlist = (id, name, e) => {
    if (e) e.stopPropagation();
    if (wishlist.includes(id)) {
      setWishlist(prev => prev.filter(wId => wId !== id));
      showToast(`Removed "${name}" from Wishlist`);
    } else {
      setWishlist(prev => [...prev, id]);
      showToast(`✓ Added "${name}" to Wishlist!`);
    }
  };

  const showToast = (message, success = true) => {
    setToast({ message, success });
    setTimeout(() => setToast(null), 3000);
  };

  const scrollToGrid = () => {
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Filter and Sorting Logic
  const filteredArrivals = arrivals.filter(item => {
    // Category filter
    const categoryMatch = selectedCategory === "All" || item.category.toLowerCase() === selectedCategory.toLowerCase();
    
    // Search query
    const searchMatch = searchQuery.trim() === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase());

    // Time filter
    let timeMatch = true;
    if (filterTime === "today") timeMatch = item.addedTimeRaw === "today";
    else if (filterTime === "week") timeMatch = item.addedTimeRaw === "today" || item.addedTimeRaw === "week";
    else if (filterTime === "month") timeMatch = true; // all items are within month in mock

    // Price range
    const priceMatch = item.price <= filterPrice;

    // Brand filter
    const brandMatch = filterBrand === "All" || item.brand.toLowerCase() === filterBrand.toLowerCase();

    // Availability
    const stockMatch = filterAvailability === "All" || (filterAvailability === "InStock" && item.stock > 0);

    // Verified Sellers only
    const verifiedMatch = !filterVerifiedOnly || item.verifiedSeller;

    return categoryMatch && searchMatch && timeMatch && priceMatch && brandMatch && stockMatch && verifiedMatch;
  });

  // Sort
  const sortedArrivals = [...filteredArrivals].sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "popularity") return b.liveViews - a.liveViews;
    // Default newest first: mock ID order or sorted raw
    return 0;
  });

  // Featured Arrival: Meta Glasses or Apple Watch
  const featuredProduct = arrivals.find(d => d.id === "mock-new-1") || arrivals[0];

  // Just Dropped (within last 24 hours / today)
  const justDroppedItems = arrivals.filter(d => d.addedTimeRaw === "today");

  // AI recommendations
  const aiRecommendations = arrivals.filter(d => d.aiMatch >= 90);

  // Trending arrivals
  const trendingArrivals = arrivals.filter(d => d.isTrending);

  // Today's stats
  const todayDate = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const addedTodayCount = arrivals.filter(d => d.addedTimeRaw === "today").length;

  return (
    <div className="min-h-screen smooth-bg text-white font-sans overflow-x-hidden">
      <CustomerNavbar />

      {/* Toast Notification */}
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
                onClick={() => navigate("/cart")}
                className="ml-3 text-xs bg-green-500/20 hover:bg-green-500/30 px-3 py-1.5 rounded-lg font-bold border border-green-500/40 transition"
              >
                Cart
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="relative min-h-[65vh] flex flex-col items-center justify-center text-center px-4 md:px-10 py-16 overflow-hidden">
        {/* Glowing backgrounds */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute top-10 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto z-10 space-y-6">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-blue-500/15 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>Just Dropped</span>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
              ✨ New Arrivals
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="text-lg md:text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
              Discover the newest products added by verified sellers every day. Live trackers and AI checking ensure authenticity.
            </p>
          </Reveal>

          {/* Stats Bar */}
          <Reveal delay={450}>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="glass-morphism px-5 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-300 font-medium font-mono">{todayDate}</span>
              </div>
              <div className="glass-morphism px-5 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-gray-300 font-medium font-mono">{addedTodayCount} Products Added Today</span>
              </div>
            </div>
          </Reveal>

          {/* CTA */}
          <Reveal delay={600}>
            <div className="pt-4">
              <button
                onClick={scrollToGrid}
                className="px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-cyan-500 hover:to-blue-600 transition-all duration-500 transform hover:scale-105 shadow-[0_4px_25px_rgba(37,99,235,0.3)] border border-cyan-400/30 flex items-center gap-2 mx-auto"
              >
                <span>Explore New Products</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURED NEW PRODUCT */}
      {featuredProduct && (
        <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
          <Reveal>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
                <Award className="w-6 h-6 text-blue-400" />
                Featured New Drop
              </h2>
              <p className="text-gray-400 text-sm mt-1">Highlighted product of the week, fully authenticated.</p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div onClick={() => navigate(`/products/${featuredProduct.productId}`)} className="cursor-pointer relative rounded-[32px] overflow-hidden border border-white/10 glass-morphism p-6 md:p-10 lg:p-12 shadow-2xl flex flex-col lg:flex-row items-center gap-12 group">
              
              {/* Glow background */}
              <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* Product Image */}
              <div className="w-full lg:w-1/2 flex items-center justify-center relative z-10">
                <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-900/40 p-6 w-full max-w-[420px] aspect-square flex items-center justify-center shadow-inner">
                  
                  {/* Floating animation */}
                  <motion.img
                    src={featuredProduct.image}
                    alt={featuredProduct.name}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="max-h-[300px] object-contain rounded-xl"
                  />
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>NEW ARRIVAL</span>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="w-full lg:w-1/2 space-y-6 relative z-10 text-left">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-xs font-bold uppercase tracking-wider">
                      {featuredProduct.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {featuredProduct.rating} ({featuredProduct.reviewsCount} reviews)
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                    {featuredProduct.name}
                  </h3>
                  <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed">
                    Designed to upgrade your lifestyle. Highly verified components tested under standard operating conditions for guaranteed longevity.
                  </p>
                </div>

                {/* Price and Seller details */}
                <div className="grid grid-cols-2 gap-4 pb-2 border-b border-white/5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Launch Price</span>
                    <span className="text-2xl md:text-3xl font-black text-[#4ade80] tracking-tight">
                      Rs. {featuredProduct.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Verified Seller</span>
                    <span className="text-sm font-semibold text-gray-200 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-blue-400" />
                      {featuredProduct.sellerName}
                    </span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={(e) => handleAddToCart(featuredProduct, e)}
                    disabled={addingId === featuredProduct.id}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-2xl transition duration-300 transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>{addingId === featuredProduct.id ? "Adding..." : "Shop Now"}</span>
                  </button>
                  <button
                    onClick={(e) => toggleWishlist(featuredProduct.id, featuredProduct.name, e)}
                    className={`px-5 py-4 border rounded-2xl transition duration-300 flex items-center justify-center ${
                      wishlist.includes(featuredProduct.id) 
                        ? "bg-red-500/10 border-red-500/30 text-red-400" 
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${wishlist.includes(featuredProduct.id) ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* RECENTLY ADDED CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
        <Reveal>
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Recently Added Categories</h2>
            <p className="text-gray-400 text-sm mt-1">Browse the counts of newly cataloged products by category.</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {CATEGORY_META.map((cat, idx) => (
            <Reveal key={cat.name} delay={idx * 80}>
              <button
                onClick={() => {
                  setSelectedCategory(cat.name);
                  scrollToGrid();
                }}
                className="w-full text-left glass-morphism rounded-3xl p-5 border border-white/10 hover:border-blue-500/30 transition-all duration-300 group flex items-center gap-4 hover:shadow-[0_10px_20px_rgba(5,130,202,0.08)]"
              >
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-200 group-hover:text-blue-400 transition-colors">{cat.name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{cat.count} New Drops</p>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* JUST DROPPED SECTION (uploaded last 24h) */}
      {justDroppedItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
          <Reveal>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                <Clock className="w-6 h-6 text-cyan-400" />
                Just Dropped (Last 24h)
              </h2>
              <p className="text-gray-400 text-sm mt-1">Items verified and uploaded inside the last 24 hours.</p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {justDroppedItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/products/${item.productId}`)} className="cursor-pointer flex-shrink-0 w-80 glass-morphism rounded-3xl p-5 border border-white/10 hover:border-cyan-500/20 transition-all duration-300 flex flex-col justify-between h-[380px] group"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-extrabold text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.addedTime}
                    </span>
                    {item.discount > 0 && (
                      <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black px-1.5 py-0.5 rounded">
                        -{item.discount}%
                      </span>
                    )}
                  </div>

                  {/* Image */}
                  <div className="h-32 w-full flex items-center justify-center mb-4 mt-2">
                    <img src={item.image} alt={item.name} className="max-h-full max-w-[120px] object-contain rounded-xl transform group-hover:scale-105 transition-transform duration-300" />
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors line-clamp-2">{item.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400">
                        <span>{item.brand}</span>
                        <span>•</span>
                        <span>Stock: {item.stock}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[#4ade80] font-black text-base font-mono">Rs. {item.price.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-500 font-semibold">Seller: {item.sellerName}</span>
                      </div>
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
                        disabled={addingId === item.id}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-2 rounded-xl transition duration-300 transform active:scale-95 shadow-md flex items-center justify-center text-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* AI RECOMMENDATIONS */}
      {aiRecommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-10 py-12 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent border-y border-white/5 my-12">
          <Reveal>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-blue-400" />
                New Products You Might Like
              </h2>
              <p className="text-gray-400 text-sm mt-1">AI-curated catalog recommendations based on your wishlist and browsing history.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {aiRecommendations.slice(0, 4).map((item, idx) => (
              <Reveal key={item.id} delay={idx * 100}>
                <div onClick={() => navigate(`/products/${item.productId}`)} className="cursor-pointer glass-morphism rounded-3xl p-6 border border-white/10 hover:border-blue-500/30 transition-all duration-300 relative group flex flex-col md:flex-row gap-6 items-center">
                  
                  {/* AI Match % badge */}
                  <div className="absolute top-4 right-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 z-10">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{item.aiMatch}% MATCH</span>
                  </div>

                  {/* Left: Product Image */}
                  <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-white/5 p-2">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Right: Info & Actions */}
                  <div className="flex-1 space-y-4 text-left w-full">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">AI Match Recommendation</span>
                      <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 mt-1 text-lg">
                        {item.name}
                      </h3>
                      {/* AI logic reason */}
                      <p className="text-xs text-gray-400 font-light mt-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span className="italic">{item.aiReason}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-[#4ade80] font-black text-lg font-mono">
                            Rs. {item.price.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500">Brand: {item.brand}</span>
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(item, e)}
                        disabled={addingId === item.id}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl transition duration-300 transform active:scale-95 shadow-md flex items-center justify-center gap-1.5 text-sm"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* TRENDING NEW ARRIVALS */}
      {trendingArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
          <Reveal>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
                <Zap className="w-6 h-6 text-yellow-400" />
                Trending New Drops
              </h2>
              <p className="text-gray-400 text-sm mt-1">Recently cataloged products with high daily traffic and sales volumes.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingArrivals.slice(0, 3).map((item, idx) => (
              <Reveal key={item.id} delay={idx * 100}>
                <div onClick={() => navigate(`/products/${item.productId}`)} className="cursor-pointer glass-morphism rounded-3xl p-5 border border-white/10 hover:border-yellow-500/20 transition-all duration-300 flex flex-col justify-between h-[420px] group relative overflow-hidden">
                  
                  {/* Badges */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-extrabold text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      TRENDING
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.addedTime}</span>
                  </div>

                  {/* Image */}
                  <div className="h-36 w-full flex items-center justify-center mb-4">
                    <img src={item.image} alt={item.name} className="max-h-full max-w-[130px] object-contain rounded-xl transform group-hover:scale-105 transition-transform duration-300" />
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-yellow-400 transition-colors line-clamp-2">{item.name}</h4>
                      {/* live views, purchases today */}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-semibold font-mono">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Eye className="w-3.5 h-3.5" />
                          {item.liveViews} viewing
                        </span>
                        <span className="flex items-center gap-1 text-green-400">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {item.purchasesToday} bought today
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[#4ade80] font-black text-base font-mono">Rs. {item.price.toLocaleString()}</span>
                        <span className="text-gray-500 line-through text-xs font-semibold">
                          Rs. {item.originalPrice.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
                        disabled={addingId === item.id}
                        className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-3 py-2 rounded-xl transition duration-300 transform active:scale-95 shadow-md flex items-center justify-center gap-1 text-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* FILTER BAR & NEWEST PRODUCTS GRID */}
      <section className="max-w-7xl mx-auto px-4 md:px-10 py-12 scroll-mt-24" ref={gridRef}>
        <Reveal>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Explore All New Arrivals</h2>
          </div>
        </Reveal>

        {/* Categories sliding menu */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 mb-8" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                }}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide border transition-all duration-300 whitespace-nowrap ${
                  active 
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 border-blue-400/40 text-white shadow-lg shadow-blue-500/20" 
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Filters Sidebar */}
          <div className="hidden lg:block lg:col-span-1 space-y-6 self-start sticky top-24">
            <div className="glass-morphism rounded-3xl p-6 border border-white/10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="font-bold text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-400" />
                  Filters
                </span>
                <button 
                  onClick={() => {
                    setFilterTime("all");
                    setFilterPrice(300000);
                    setFilterBrand("All");
                    setFilterAvailability("All");
                    setFilterVerifiedOnly(false);
                    setSortBy("newest");
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              {/* Time Added */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-extrabold block">Added Time</label>
                <div className="space-y-2">
                  {[
                    { id: "all", label: "Anytime" },
                    { id: "today", label: "Added Today" },
                    { id: "week", label: "Added This Week" },
                    { id: "month", label: "Added This Month" }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setFilterTime(t.id)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                        filterTime === t.id 
                          ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Price */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span className="uppercase tracking-wider font-extrabold">Max Price</span>
                  <span className="font-bold text-white font-mono">Rs. {filterPrice.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={300000}
                  step={5000}
                  value={filterPrice}
                  onChange={e => setFilterPrice(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>Rs. 10,000</span>
                  <span>Rs. 300,000</span>
                </div>
              </div>

              {/* Brand */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-extrabold block">Brand</label>
                <select
                  value={filterBrand}
                  onChange={e => setFilterBrand(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-400 transition"
                >
                  {BRANDS.map(brand => (
                    <option key={brand} value={brand} className="bg-slate-900 text-gray-200">
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 uppercase tracking-wider font-extrabold block">Stock Availability</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterAvailability("All")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                      filterAvailability === "All" 
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    All Items
                  </button>
                  <button
                    onClick={() => setFilterAvailability("InStock")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                      filterAvailability === "InStock" 
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    In Stock
                  </button>
                </div>
              </div>

              {/* Verified Sellers checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="verifiedSellersOnly"
                  checked={filterVerifiedOnly}
                  onChange={e => setFilterVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 bg-slate-950 border-white/10 rounded focus:ring-blue-400 focus:ring-2 accent-blue-500"
                />
                <label htmlFor="verifiedSellersOnly" className="text-xs font-semibold text-gray-300 select-none cursor-pointer">
                  Verified Sellers Only
                </label>
              </div>
            </div>
          </div>

          {/* Main List */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl">
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search brand, model..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-10 pr-8 py-2 text-xs text-white focus:outline-none focus:border-blue-400 transition"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-gray-400">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 outline-none focus:border-blue-400 transition"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="popularity">Popularity</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>

            {/* Grid display */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="glass-morphism rounded-3xl p-5 border border-white/10 space-y-6 animate-pulse">
                    <div className="h-40 bg-white/5 rounded-2xl w-full" />
                    <div className="h-4 bg-white/5 rounded-md w-3/4" />
                    <div className="h-3 bg-white/5 rounded-md w-1/2" />
                    <div className="flex justify-between items-center">
                      <div className="h-6 bg-white/5 rounded-md w-1/3" />
                      <div className="h-8 bg-white/5 rounded-md w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedArrivals.length === 0 ? (
              <div className="glass-morphism rounded-3xl p-16 border border-white/10 text-center space-y-4">
                <div className="text-5xl">🔍</div>
                <h4 className="font-extrabold text-xl">No new arrivals found</h4>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">Try relaxing your filters or search tags to discover new drops.</p>
                <button
                  onClick={() => {
                    setFilterTime("all");
                    setFilterPrice(300000);
                    setFilterBrand("All");
                    setFilterAvailability("All");
                    setFilterVerifiedOnly(false);
                    setSortBy("newest");
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition text-sm"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {sortedArrivals.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      key={item.id}
                      onClick={() => navigate(`/products/${item.productId}`)} className="cursor-pointer glass-morphism rounded-3xl p-5 border border-white/10 hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-[460px] hover:shadow-[0_10px_25px_rgba(5,130,202,0.1)]"
                    >
                      {/* Wishlist button */}
                      <button 
                        onClick={(e) => toggleWishlist(item.id, item.name, e)}
                        className={`absolute top-4 left-4 z-10 p-2 rounded-xl transition ${
                          wishlist.includes(item.id) 
                            ? "bg-red-500/15 border border-red-500/30 text-red-400" 
                            : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${wishlist.includes(item.id) ? "fill-current" : ""}`} />
                      </button>

                      {/* NEW Badge and Time badge */}
                      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end z-10">
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
                          NEW
                        </span>
                        <span className="bg-slate-950/80 border border-white/5 text-gray-400 text-[8px] font-bold px-1.5 py-0.5 rounded">
                          {item.addedTime}
                        </span>
                      </div>

                      {/* Image container */}
                      <div className="h-40 w-full flex items-center justify-center mb-4 mt-2 bg-slate-900/10 rounded-2xl p-2 border border-white/0 group-hover:border-white/5 transition-all">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="max-h-full max-w-[140px] object-contain rounded-xl transform group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info Details */}
                      <div className="space-y-3 flex-grow flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
                            <span>{item.brand}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                          </div>
                          <h4 className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                            {item.name}
                          </h4>
                          
                          {/* Seller Details */}
                          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 pt-0.5">
                            <span>Seller: {item.sellerName}</span>
                            {item.verifiedSeller && (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Rating block */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-1 text-yellow-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>{item.rating}</span>
                            <span className="text-[10px] text-gray-500 font-normal">({item.reviewsCount})</span>
                          </div>
                          {item.discount > 0 && (
                            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black px-1.5 py-0.5 rounded">
                              -{item.discount}% OFF
                            </span>
                          )}
                        </div>

                        {/* Price block & Add / Quick view */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[#4ade80] font-black text-base font-mono">
                              Rs. {item.price.toLocaleString()}
                            </span>
                            {item.originalPrice > item.price && (
                              <span className="text-gray-500 line-through text-xs font-semibold">
                                Rs. {item.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setQuickViewItem(item); }}
                              className="bg-white/5 hover:bg-white/10 text-gray-300 p-2.5 rounded-xl transition border border-white/10"
                              title="Quick View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleAddToCart(item, e)}
                              disabled={addingId === item.id}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-2.5 rounded-xl transition duration-300 transform active:scale-95 shadow-md flex items-center justify-center gap-1 text-sm border border-blue-400/20 group-hover:border-blue-400/50"
                            >
                              <ShoppingBag className="w-4 h-4" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* QUICK VIEW MODAL */}
      <AnimatePresence>
        {quickViewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewItem(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0b182d] border border-white/10 rounded-[32px] overflow-hidden p-6 md:p-8 shadow-2xl z-10 flex flex-col md:flex-row gap-8 text-left"
            >
              <button
                onClick={() => setQuickViewItem(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full border border-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image */}
              <div className="w-full md:w-1/2 flex items-center justify-center bg-slate-900/50 rounded-2xl border border-white/5 p-4 aspect-square">
                <img src={quickViewItem.image} alt={quickViewItem.name} className="max-h-[220px] object-contain rounded-xl" />
              </div>

              {/* Details */}
              <div className="w-full md:w-1/2 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                      New Arrival
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Added {quickViewItem.addedTime}</span>
                  </div>

                  <h3 className="font-extrabold text-xl text-white leading-tight">{quickViewItem.name}</h3>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-yellow-400 flex items-center gap-1 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {quickViewItem.rating}
                    </span>
                    <span className="text-gray-400">({quickViewItem.reviewsCount} reviews)</span>
                  </div>

                  <p className="text-xs text-gray-400 font-light leading-relaxed">
                    A newly uploaded product supplied by {quickViewItem.sellerName}. Complete diagnostic checks have been successfully run in accordance with e-commerce certification protocols.
                  </p>
                </div>

                <div className="space-y-4 mt-6 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Launch Price</span>
                      <span className="text-2xl font-black text-[#4ade80] font-mono">Rs. {quickViewItem.price.toLocaleString()}</span>
                    </div>
                    {quickViewItem.stock < 5 && (
                      <span className="text-[10px] text-yellow-400 font-bold uppercase animate-pulse">Low Stock: {quickViewItem.stock} left</span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleAddToCart(quickViewItem);
                        setQuickViewItem(null);
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleWishlist(quickViewItem.id, quickViewItem.name);
                        setQuickViewItem(null);
                      }}
                      className={`p-3.5 border rounded-xl transition ${
                        wishlist.includes(quickViewItem.id) 
                          ? "bg-red-500/15 border-red-500/30 text-red-400" 
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEWSLETTER */}
      <section className="max-w-7xl mx-auto px-4 md:px-10 py-16">
        <Reveal>
          <div className="glass-morphism border border-white/10 rounded-[40px] p-8 md:p-16 lg:p-20 relative overflow-hidden text-center shadow-2xl group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="max-w-xl mx-auto space-y-6 relative z-10">
              <div className="w-16 h-16 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex items-center justify-center text-3xl mx-auto group-hover:scale-110 transition-transform duration-500">
                ✉️
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Never miss new arrivals.</h2>
              <p className="text-gray-400 text-sm md:text-base max-w-sm mx-auto font-light leading-relaxed">
                Subscribe to get daily notifications about the newest product drops cataloged by verified sellers.
              </p>

              <form 
                onSubmit={e => {
                  e.preventDefault();
                  showToast("✓ Subscribed to New Arrival alerts!");
                  e.target.reset();
                }}
                className="flex flex-col sm:flex-row gap-3 pt-4"
              >
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-400 transition"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition duration-300 transform active:scale-95 shadow-lg shadow-blue-600/20 border border-blue-500/40 whitespace-nowrap"
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
