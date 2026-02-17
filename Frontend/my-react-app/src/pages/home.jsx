import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SponsorBar from "../components/sponsorbar.jsx";
import CountUp from "../components/CountUp.jsx";
import Reveal from "../components/Reveal.jsx";
import PopupReveal from "../components/Popup Reveal.jsx";
import SeasonalCarShowcase from "../components/seasonalCar.jsx";

/* ✅ CATEGORY LIST */
const categories = [
  "Electronics",
  "Fashion",
  "Home",
  "Sports",
  "Beauty",
  "Books",
  "Others",
];

export default function Home() {
  const navigate = useNavigate();
  const [showCategories, setShowCategories] = useState(false);

  return (
    <div className="min-h-screen smooth-bg text-white">
      {/* TOP ROW */}
      <div className="flex items-center justify-between px-10 pt-10 h-16">
        {/* LEFT: Brand */}
        <div className="text-2xl font-bold tracking-wide">BEETA</div>

        {/* CENTER: Buttons */}
        <div className="flex font-thin items-center gap-8">
          {/* ✅ FINAL ATTRACTIVE ALL CATEGORIES DROPDOWN */}
          <div
            className="relative"
            onMouseEnter={() => setShowCategories(true)}
            onMouseLeave={() => setShowCategories(false)}
          >
            <button className="hover:text-blue-400 transition">
              All Categories
            </button>

            {/* Dropdown (NO GAP, STABLE) */}
            {showCategories && (
              <div className="absolute left-0 top-full pt-3 z-50">
                <div
                  className="
                    w-56
                    rounded-xl
                    overflow-hidden
                    backdrop-blur-lg
                    bg-gradient-to-b
                    from-[#0b1c2d]
                    via-[#0f2a44]
                    to-[#071421]
                    border
                    border-white/10
                    shadow-2xl
                  "
                >
                  {categories.map((cat, index) => (
                    <div key={cat}>
                      {/* CATEGORY ITEM */}
                      <div
                        onClick={() => {
                          setShowCategories(false);
                          navigate(
                            `/products?category=${cat.toLowerCase()}`
                          );
                        }}
                        className="
                          relative
                          group
                          flex
                          items-center
                          px-5
                          py-3
                          cursor-pointer
                          text-sm
                          text-gray-200
                          transition-all
                          duration-300
                          hover:text-white
                          hover:bg-gradient-to-r
                          hover:from-[#006494]/40
                          hover:to-[#00a6fb]/40
                        "
                      >
                        {/* 🔹 LIGHT-BLUE HIGHLIGHT PANEL */}
                        <span
                          className="
                            absolute
                            left-0
                            top-0
                            h-full
                            w-1
                            bg-[#4ac6ff]
                            opacity-0
                            group-hover:opacity-100
                            transition-all
                            duration-300
                            rounded-r
                            shadow-[0_0_10px_#4ac6ff]
                          "
                        />

                        {/* CATEGORY TEXT */}
                        <span className="relative z-10 group-hover:translate-x-2 transition-transform duration-300">
                          {cat}
                        </span>
                      </div>

                      {/* DIVIDER */}
                      {index !== categories.length - 1 && (
                        <div className="h-px bg-white/10 mx-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="hover:text-blue-400 transition">Deals</button>
          <button className="hover:text-blue-400 transition">New</button>
          <button className="hover:text-blue-400 transition">Trending</button>
          <button className="hover:text-blue-400 transition">Support</button>
          <button className="hover:text-blue-400 transition">About</button>
        </div>

        {/* RIGHT: Auth Buttons */}
        <div className="flex items-center font-thin gap-4">
          <button
            onClick={() => navigate("/login")}
            className="hover:text-blue-400 transition"
          >
            Login
          </button>

          <button className="px-4 py-1 rounded border border-white/30 hover:bg-white/10 transition">
            Sign Up
          </button>
        </div>
      </div>

      {/* HERO SECTION */}
      <div className="flex flex-col md:flex-row items-center justify-center text-center md:text-left mt-20 px-10 md:px-20 gap-10">
        <div className="mt-[60px] md:w-1/2">
          <Reveal delay={0}>
            <p className="text-xl pb-8 md:text-lg text-[#4ac6ff] font-regular">
              Build With Intelligence
            </p>
          </Reveal>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <Reveal delay={250}>
              <span className="block">Smarter Products.</span>
            </Reveal>
            <Reveal delay={400}>
              <span className="block mt-3">Faster Decisions.</span>
            </Reveal>
            <Reveal delay={550}>
              <span className="block mt-3">Better Shopping.</span>
            </Reveal>
          </h1>

          <Reveal delay={800}>
            <p className="text-lg md:text-lg font-thin pt-10 text-gray-300 mb-6">
              Discover products curated by intelligent algorithms that
              understand your preferences. Our AI-driven platform delivers
              personalized recommendations, faster discovery, and a seamless
              shopping experience.
            </p>
          </Reveal>

          <PopupReveal delay={1200}>
            {(visible) => (
              <div className="pt-14">
                <button
                  onClick={() => navigate("/products")}
                  className={`
                    px-6 py-3
                    rounded-2xl
                    font-semibold
                    text-white
                    bg-gradient-to-r
                    from-[#006494]
                    via-[#0582ca]
                    to-[#00a6fb]
                    transition-all
                    duration-500
                    transform-gpu
                    origin-center
                    ${visible ? "scale-100 opacity-100" : "scale-75 opacity-0"}
                    hover:scale-105
                  `}
                >
                  Discover Products
                </button>
              </div>
            )}
          </PopupReveal>
        </div>

        {/* IMAGE */}
        <div className="md:w-1/2">
          <img
            src="/3dimage.png"
            alt="Featured Product"
            className="w-full h-auto rounded-lg"
          />
        </div>
      </div>

      {/* STATS */}
      <div className="flex justify-center mt-24">
        <div className="flex flex-col md:flex-row gap-16 text-center">
          <div>
            <CountUp
              end={1250}
              duration={2000}
              className="text-5xl md:text-6xl font-bold text-blue-400"
            />
            <p className="text-gray-400 mt-2 uppercase tracking-wide">
              Active Users
            </p>
          </div>

          <div>
            <CountUp
              end={550}
              duration={2000}
              className="text-5xl md:text-6xl font-bold text-blue-400"
            />
            <p className="text-gray-400 mt-2 uppercase tracking-wide">
              Brands
            </p>
          </div>

          <div>
            <CountUp
              end={50}
              duration={2000}
              className="text-5xl md:text-6xl font-bold text-blue-400"
            />
            <p className="text-gray-400 mt-2 uppercase tracking-wide">
              Certifications
            </p>
          </div>
        </div>
      </div>

      <SponsorBar />
      <SeasonalCarShowcase />
    </div>
  );
}
