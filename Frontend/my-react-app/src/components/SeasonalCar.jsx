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

    // Initial fetch
    fetchTrending();

    // Silently refresh data every 1 minute (60,000 ms) to keep the UI feeling live
    const intervalId = setInterval(fetchTrending, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const baseAnimation = "transition-all duration-700 ease-out transform";

  // Data mapping for structure
  const product1 = trendingData[0] || { Keyword: "Loading..." };
  const product2 = trendingData[1] || { Keyword: "Loading..." };
  const product3 = trendingData[2] || { Keyword: "Loading..." };

  // Placehold.co for dynamic image rendering
  const getSmallImg = (keyword) => `https://placehold.co/400x400/00c3ff/ffffff?text=${encodeURIComponent(keyword)}`;
  const getLargeImg = (keyword) => `https://placehold.co/800x800/111111/ffffff?text=${encodeURIComponent(keyword)}`;

  return (
    <section
      ref={sectionRef}
      className="w-full min-h-screen flex flex-col items-center justify-center mt-32 px-6"
    >
      {/* 1️⃣ TITLE (same animation style as right box) */}
      <h2
        className={`${baseAnimation} text-4xl font-bold mb-12 text-center ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "0ms" }}
      >
        Live Top Trends
      </h2>

      {/* MAIN GRID */}
      <div className="w-full max-w-6xl aspect-[2/1] grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT SIDE */}
        <div className="grid grid-rows-2 gap-6">
          {/* 2️⃣ LEFT BOX 1 */}
          <div
            className={`${baseAnimation} bg-[#00c3ff] rounded-2xl shadow-lg flex flex-col items-center justify-center ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <img
              src={getSmallImg(product1.Keyword)}
              alt={product1.Keyword}
              className="w-28 h-28 object-contain mb-3 rounded-lg"
            />
            <p className="font-semibold text-lg text-white">
              {product1.Keyword}
            </p>
          </div>

          {/* 3️⃣ LEFT BOX 2 */}
          <div
            className={`${baseAnimation} bg-[#00c3ff] rounded-2xl shadow-lg flex flex-col items-center justify-center ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <img
              src={getSmallImg(product2.Keyword)}
              alt={product2.Keyword}
              className="w-28 h-28 object-contain mb-3 rounded-lg"
            />
            <p className="font-semibold text-lg text-white">
              {product2.Keyword}
            </p>
          </div>
        </div>

        {/* 4️⃣ RIGHT BOX (CAR) */}
        <div
          className={`${baseAnimation} bg-[#111] rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <img
            src={getLargeImg(product3.Keyword)}
            alt={product3.Keyword}
            className="w-[75%] object-contain rounded-xl"
          />

          <div className="absolute top-4 right-4 bg-white text-black px-4 py-1 rounded-full text-sm font-semibold shadow">
            Trending #1
          </div>
          <p className="font-semibold text-lg text-white mt-4 absolute bottom-8">
            {product3.Keyword}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div
        className={`${baseAnimation} flex gap-6 mt-12 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "800ms" }}
      >
        <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition">
          Previous
        </button>
        <button className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition">
          Next
        </button>
      </div>
    </section>
  );
};

export default TrendingProductsShowcase;
