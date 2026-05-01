import React, { useState, useEffect, useRef } from "react";

const seasonalData = [
  {
    season: "Summer",
    carImage: "/images/car-summer.png",
    products: [
      { name: "Portable Cooler", image: "/images/cooler.png" },
      { name: "Beach Umbrella", image: "/images/umbrella.png" },
      { name: "Travel Sunglasses", image: "/images/sunglasses.png" },
    ],
  },
  {
    season: "Winter",
    carImage: "/images/car-winter.png",
    products: [
      { name: "Car Heater", image: "/images/heater.png" },
      { name: "Snow Tires", image: "/images/tires.png" },
      { name: "Winter Jacket", image: "/images/jacket.png" },
    ],
  },
  {
    season: "Autumn",
    carImage: "/images/car-autumn.png",
    products: [
      { name: "Leather Boots", image: "/images/boots.png" },
      { name: "Pumpkin Decor", image: "/images/pumpkin.png" },
      { name: "Cozy Blanket", image: "/images/blanket.png" },
    ],
  },
];

const SeasonalCarShowcase = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const nextSeason = () => {
    setCurrentIndex((prev) => (prev + 1) % seasonalData.length);
  };

  const prevSeason = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + seasonalData.length) % seasonalData.length
    );
  };

  const currentSeason = seasonalData[currentIndex];

  const baseAnimation =
    "transition-all duration-700 ease-out transform";

  return (
    <section
      ref={sectionRef}
      className="w-full min-h-screen flex flex-col items-center justify-center mt-32 px-6"
    >

      {/* 1️⃣ TITLE (same animation style as right box) */}
      <h2
        className={`${baseAnimation} text-4xl font-bold mb-12 text-center ${
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "0ms" }}
      >
        {currentSeason.season} Top Trends
      </h2>

      {/* MAIN GRID */}
      <div className="w-full max-w-6xl aspect-[2/1] grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT SIDE */}
        <div className="grid grid-rows-2 gap-6">

          {/* 2️⃣ LEFT BOX 1 */}
          <div
            className={`${baseAnimation} bg-[#00c3ff] rounded-2xl shadow-lg flex flex-col items-center justify-center ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            <img
              src={currentSeason.products[0].image}
              alt={currentSeason.products[0].name}
              className="w-28 h-28 object-contain mb-3"
            />
            <p className="font-semibold text-lg text-white">
              {currentSeason.products[0].name}
            </p>
          </div>

          {/* 3️⃣ LEFT BOX 2 */}
          <div
            className={`${baseAnimation} bg-[#00c3ff] rounded-2xl shadow-lg flex flex-col items-center justify-center ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <img
              src={currentSeason.products[1].image}
              alt={currentSeason.products[1].name}
              className="w-28 h-28 object-contain mb-3"
            />
            <p className="font-semibold text-lg text-white">
              {currentSeason.products[1].name}
            </p>
          </div>

        </div>

        {/* 4️⃣ RIGHT BOX (CAR) */}
        <div
          className={`${baseAnimation} bg-[#111] rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <img
            src={currentSeason.carImage}
            alt="Seasonal Car"
            className="w-[75%] object-contain"
          />

          <div className="absolute top-4 right-4 bg-white text-black px-4 py-1 rounded-full text-sm font-semibold shadow">
            {currentSeason.season}
          </div>
        </div>

      </div>

      {/* Buttons */}
      <div
        className={`${baseAnimation} flex gap-6 mt-12 ${
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10"
        }`}
        style={{ transitionDelay: "800ms" }}
      >
        <button
          onClick={prevSeason}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          Previous
        </button>
        <button
          onClick={nextSeason}
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          Next
        </button>
      </div>

    </section>
  );
};

export default SeasonalCarShowcase;
