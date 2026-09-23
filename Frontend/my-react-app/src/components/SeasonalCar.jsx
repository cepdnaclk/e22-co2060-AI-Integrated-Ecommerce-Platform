import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";

const TrendingProductsShowcase = () => {
  const [trendingData, setTrendingData] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);
  const navigate = useNavigate();

  // Viewport reveal trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch trending products (Prioritizes LangChain YouTube trending extraction)
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Try LangChain extracted YouTube trending products first
        const response = await fetch(`${API_BASE_URL}/api/trending/products`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          }
        });
        if (response.ok) {
          const data = await response.json();
          const items = data.top_products || data.report?.top_trending_products || [];
          if (Array.isArray(items) && items.length > 0) {
            setTrendingData(items.slice(0, 3));
            return;
          }
        }

        // Fallback to standard trending signals
        const fallbackRes = await fetch(`${API_BASE_URL}/api/trending`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            setTrendingData(fallbackData.slice(0, 3));
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching trending data:", error);
      }

      // Default fallback
      setTrendingData([
        { Keyword: "Gaming Laptop", trending_badge: "🔥 Top Viral", why_trending: "RTX 40-series performance benchmarks" },
        { Keyword: "Wireless ANC Headphones", trending_badge: "⚡ Creator Pick", why_trending: "Premium noise cancellation reviews" },
        { Keyword: "Flagship Smartphone", trending_badge: "🚀 Trending Now", why_trending: "New generation AI camera tests" },
      ]);
    };

    fetchTrending();
    const intervalId = setInterval(fetchTrending, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const baseAnimation = "transition-all duration-700 ease-out transform";

  const formatItem = (item) => {
    if (!item) return { title: "Loading...", badge: "Trending", why: "", searchKey: "" };
    const title = item.trending_product_name || item.matched_store_product_name || item.Keyword || "Trending Device";
    const badge = item.trending_badge || (item.GrowthRate ? `+${Math.round(item.GrowthRate * 100)}% Surge` : "🔥 Hot");
    const why = item.why_trending || "";
    const searchKey = item.matched_store_product_name || item.trending_product_name || item.Keyword || title;
    return { title, badge, why, searchKey, raw: item };
  };

  // Data mapping
  const product1 = formatItem(trendingData[0]);
  const product2 = formatItem(trendingData[1]);
  const product3 = formatItem(trendingData[2]);

  // Manual image overrides to present complete/attractive sections
  const MANUAL_IMAGES = {
    "Android Phone": "/trends/android.png",
    "iPhone": "/trends/iphone.png",
    "Laptop": "/trends/laptop.png"
  };

  const getImg = (keyword, isLarge = false) => {
    if (MANUAL_IMAGES[keyword]) return MANUAL_IMAGES[keyword];
    const dim = isLarge ? "800x800" : "400x400";
    const bg = isLarge ? "0f172a" : "006494";
    return `https://placehold.co/${dim}/${bg}/ffffff?text=${encodeURIComponent(keyword || "Tech")}`;
  };

  const handleProductClick = (searchKey) => {
    if (searchKey && searchKey !== "Loading...") {
      navigate(`/products?search=${encodeURIComponent(searchKey)}`);
    }
  };

  return (
    <section
      ref={sectionRef}
      className="w-full min-h-screen flex flex-col items-center justify-center mt-32 px-6"
    >
      {/* 1️⃣ TITLE */}
      <div className="text-center mb-12">
        <span className="px-3.5 py-1 rounded-full text-xs font-black bg-purple-500/20 border border-purple-500/40 text-purple-300 uppercase tracking-widest inline-block mb-3">
          YouTube Viral Intelligence
        </span>
        <h2
          className={`${baseAnimation} text-4xl sm:text-5xl font-bold text-center text-white ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "0ms" }}
        >
          Trending on Tech YouTube
        </h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          AI-detected creator favorites and viral hardware benchmarks matched to store inventory
        </p>
      </div>

      {/* MAIN GRID */}
      <div className="w-full max-w-6xl aspect-[2/1] grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT SIDE */}
        <div className="grid grid-rows-2 gap-6">
          {/* 2️⃣ LEFT BOX 1 */}
          <div
            onClick={() => handleProductClick(product1.searchKey)}
            className={`${baseAnimation} cursor-pointer bg-gradient-to-br from-[#00c3ff] to-[#0084ff] rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
            <img
              src={getImg(product1.title, false)}
              alt={product1.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 z-0"
            />
            <div className="absolute top-4 left-4 z-20">
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
                {product1.badge}
              </span>
            </div>
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <p className="font-bold text-xl sm:text-2xl text-white tracking-wide drop-shadow-lg truncate">
                {product1.title}
              </p>
              {product1.why && (
                <p className="text-xs text-slate-300 line-clamp-1 mt-1 opacity-90">{product1.why}</p>
              )}
            </div>
          </div>

          {/* 3️⃣ LEFT BOX 2 */}
          <div
            onClick={() => handleProductClick(product2.searchKey)}
            className={`${baseAnimation} cursor-pointer bg-gradient-to-br from-[#00c3ff] to-[#0084ff] rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
            <img
              src={getImg(product2.title, false)}
              alt={product2.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 z-0"
            />
            <div className="absolute top-4 left-4 z-20">
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-purple-300 border border-purple-400/30">
                {product2.badge}
              </span>
            </div>
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <p className="font-bold text-xl sm:text-2xl text-white tracking-wide drop-shadow-lg truncate">
                {product2.title}
              </p>
              {product2.why && (
                <p className="text-xs text-slate-300 line-clamp-1 mt-1 opacity-90">{product2.why}</p>
              )}
            </div>
          </div>
        </div>

        {/* 4️⃣ RIGHT BOX (FEATURED) */}
        <div
          onClick={() => handleProductClick(product3.searchKey)}
          className={`${baseAnimation} cursor-pointer bg-gradient-to-br from-[#111] via-[#1e1b4b] to-[#000] rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
          <img
            src={getImg(product3.title, true)}
            alt={product3.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 z-0"
          />

          <div className="absolute top-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-2xl tracking-wide uppercase z-20 border border-white/20">
            {product3.badge}
          </div>
          
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-8 left-8 right-8 z-20">
            <p className="font-bold text-2xl sm:text-3xl text-white tracking-wide drop-shadow-lg">
              {product3.title}
            </p>
            {product3.why && (
              <p className="text-xs sm:text-sm text-slate-300 mt-2 line-clamp-2 max-w-lg">
                {product3.why}
              </p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
              Shop Trending Tech →
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div
        className={`${baseAnimation} flex gap-8 mt-16 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "800ms" }}
      >
        <button className="px-8 py-3 bg-black/80 backdrop-blur-md text-white border border-white/10 rounded-xl hover:bg-black hover:border-blue-500/50 transition-all duration-300 shadow-xl">
          Prev
        </button>
        <button className="px-8 py-3 bg-black/80 backdrop-blur-md text-white border border-white/10 rounded-xl hover:bg-black hover:border-blue-500/50 transition-all duration-300 shadow-xl">
          Next
        </button>
      </div>
    </section>
  );
};

export default TrendingProductsShowcase;

