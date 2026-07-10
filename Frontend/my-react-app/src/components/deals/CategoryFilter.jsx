// src/components/deals/CategoryFilter.jsx
// Horizontal scrolling category pill filter.
// Calls onSelect(category) when a pill is clicked.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

const ALL_CATEGORIES = [
  "All", "Electronics", "Fashion", "Gaming", "Home",
  "Beauty", "Books", "Sports", "Accessories",
];

/**
 * @param {string}   selected   - Currently active category string
 * @param {Function} onSelect   - Callback: (category: string) => void
 * @param {string[]} categories - Optional override list (defaults to ALL_CATEGORIES)
 */
export default function CategoryFilter({ selected, onSelect, categories = ALL_CATEGORIES }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Pills */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((cat) => {
          const active = selected === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`
                flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-300 whitespace-nowrap
                ${active
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 border-blue-400/40 text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                }
              `}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
