import React from "react";
import SponsorBar from "../components/sponsorbar.jsx";
import CountUp from "../components/CountUp.jsx";
import Reveal from "../components/Reveal.jsx";
import PopupReveal from "../components/Popup Reveal.jsx";

export default function Home() {
  return (
    <div className="min-h-screen smooth-bg text-white">
      {/* TOP ROW */}
      <div className="flex items-center justify-between px-10 pt-10 h-16">
        {/* LEFT: Brand */}
        <div className="text-2xl font-bold tracking-wide">BEETA</div>

        {/* CENTER: Buttons */}
        <div className="flex font-thin items-center gap-8">
          {/* All Categories Dropdown */}
          <div className="relative group">
            {/* Trigger */}
            <button className="hover:text-blue-400 transition">
              All Categories
            </button>

            {/* Hover-safe dropdown wrapper */}
            <div
              className="
                absolute left-0 top-full pt-2
                opacity-0 invisible translate-y-1
                group-hover:opacity-100 group-hover:visible
                group-hover:translate-y-0
                transition-all duration-200
              "
            >
              {/* Dropdown box */}
              <div className="bg-black/35 backdrop-blur rounded-lg w-52 shadow-lg overflow-hidden">
                <button
                  className="
                    block w-full text-left px-4 py-3
                    transition
                    border-b border-white/10
                    hover:bg-white/10
                    hover:border-l-4 hover:border-l-[#00a6fb]
                  "
                >
                  Electronics
                </button>

                <button
                  className="
                    block w-full text-left px-4 py-3
                    transition
                    border-b border-white/10
                    hover:bg-white/10
                    hover:border-l-4 hover:border-l-[#00a6fb]
                  "
                >
                  Fashion
                </button>

                <button
                  className="
                    block w-full text-left px-4 py-3
                    transition
                    border-b border-white/10
                    hover:bg-white/10
                    hover:border-l-4 hover:border-l-[#00a6fb]
                  "
                >
                  Home & Living
                </button>

                <button
                  className="
                    block w-full text-left px-4 py-3
                    transition
                    hover:bg-white/10
                    hover:border-l-4 hover:border-l-[#00a6fb]
                  "
                >
                  Sports
                </button>
              </div>
            </div>
          </div>

          <button className="hover:text-blue-400 transition">Deals</button>
          <button className="hover:text-blue-400 transition">New</button>
          <button className="hover:text-blue-400 transition">Trending</button>
          <button className="hover:text-blue-400 transition">Support</button>
          <button className="hover:text-blue-400 transition">About</button>
        </div>

        {/* RIGHT: Auth Buttons */}
        <div className="flex items-center font-thin gap-4">
          <button className="hover:text-blue-400 transition">Login</button>
          <button className="px-4 py-1 rounded border border-white/30 hover:bg-white/10 transition">
            Sign Up
          </button>
        </div>
      </div>

      {/* CAPTION & IMAGE */}
      <div className="flex flex-col md:flex-row items-center justify-center text-center md:text-left mt-20 px-10 md:px-20 gap-10">
        {/* Caption */}
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
                  className={`
          px-6 py-3
          rounded-2xl
          font-semibold
          text-white
          bg-gradient-to-r
          from-[#006494]
          via-[#0582ca]
          to-[#00a6fb]
          hover:from-[#003554]
          hover:via-[#006494]
          hover:to-[#0582ca]
          transition-all
          duration-500
          transform-gpu
          origin-center
          ${visible ? "scale-100 opacity-100" : "scale-75 opacity-0"}
          hover:scale-105
          hover:shadow-[0_0_20px_rgba(0,166,251,0.25)]
        `}
                >
                  Discover Products
                </button>
              </div>
            )}
          </PopupReveal>
        </div>

        {/* Image */}
        <div className="md:w-1/2">
          <img
            src="/path/to/image.jpg"
            alt="Featured Product"
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      </div>
      <div className="flex justify-center mt-24">
        <div className="flex flex-col md:flex-row gap-16 text-center">
          {/* Counter 1 */}
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

          {/* Counter 2 */}
          <div>
            <CountUp
              end={550}
              duration={2000}
              className="text-5xl md:text-6xl font-bold text-blue-400"
            />
            <p className="text-gray-400 mt-2 uppercase tracking-wide">Brands</p>
          </div>

          {/* Counter 3 */}
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
    </div>
  );
}
