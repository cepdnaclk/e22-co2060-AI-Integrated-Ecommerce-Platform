import React, { useState, useEffect, useRef } from "react";
import API_BASE_URL from "../config/api";

const TrendingProductsShowcase = () => {
  const [trendingData, setTrendingData] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

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

  // Fetch trending products
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/trending`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          }
        });
        if (!response.ok) {
          throw new Error("Failed to fetch trending products");
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setTrendingData(data.slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching trending data:", error);
        setTrendingData([
          { Keyword: "Portable Cooler" },
          { Keyword: "Beach Umbrella" },
          { Keyword: "Seasonal Car" },
        ]);
      }
    };

    fetchTrending();
    const intervalId = setInterval(fetchTrending, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const baseAnimation = "transition-all duration-700 ease-out transform";

  // Data mapping
  const product1 = trendingData[0] || { Keyword: "Loading..." };
  const product2 = trendingData[1] || { Keyword: "Loading..." };
  const product3 = trendingData[2] || { Keyword: "Loading..." };

  // Placehold.co - remove text from URL to avoid duplication
  const getSmallImg = (keyword) => `https://placehold.co/400x400/00c3ff/ffffff?text=${encodeURIComponent(keyword)}`;
  const getLargeImg = (keyword) => `https://placehold.co/800x800/111111/ffffff?text=${encodeURIComponent(keyword)}`;

  return (
    <section
      ref={sectionRef}
      className="w-full min-h-screen flex flex-col items-center justify-center mt-32 px-6"
    >
      {/* 1️⃣ TITLE */}
      <h2
        className={`${baseAnimation} text-5xl font-bold mb-12 text-center text-white ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "0ms" }}
      >
        Summer Top Trends
      </h2>

      {/* MAIN GRID */}
      <div className="w-full max-w-6xl aspect-[2/1] grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT SIDE */}
        <div className="grid grid-rows-2 gap-6">
          {/* 2️⃣ LEFT BOX 1 */}
          <div
            className={`${baseAnimation} bg-gradient-to-br from-[#00c3ff] to-[#0084ff] rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={getSmallImg(product1.Keyword)}
              alt={product1.Keyword}
              className="w-32 h-32 object-contain mb-4 rounded-lg shadow-inner brightness-110"
            />
            <p className="font-bold text-xl text-white tracking-wide">
              {product1.Keyword}
            </p>
          </div>

          {/* 3️⃣ LEFT BOX 2 */}
          <div
            className={`${baseAnimation} bg-gradient-to-br from-[#00c3ff] to-[#0084ff] rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={getSmallImg(product2.Keyword)}
              alt={product2.Keyword}
              className="w-32 h-32 object-contain mb-4 rounded-lg shadow-inner brightness-110"
            />
            <p className="font-bold text-xl text-white tracking-wide">
              {product2.Keyword}
            </p>
          </div>
        </div>

        {/* 4️⃣ RIGHT BOX (CAR) */}
        <div
          className={`${baseAnimation} bg-gradient-to-br from-[#111] via-[#222] to-[#000] rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <img
            src={getLargeImg(product3.Keyword)}
            alt={product3.Keyword}
            className="w-[85%] object-contain rounded-2xl shadow-2xl mb-8 group-hover:scale-105 transition-transform duration-500"
          />

          <div className="absolute top-6 right-6 bg-white text-black px-5 py-2 rounded-full text-sm font-extrabold shadow-2xl tracking-tighter uppercase">
            Summer
          </div>
          
          <p className="font-bold text-2xl text-white absolute bottom-12 tracking-wide">
            {product3.Keyword}
          </p>
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
          Previous
        </button>
        <button className="px-8 py-3 bg-black/80 backdrop-blur-md text-white border border-white/10 rounded-xl hover:bg-black hover:border-blue-500/50 transition-all duration-300 shadow-xl">
          Next
        </button>
      </div>
    </section>
  );
};

export default TrendingProductsShowcase;

