import React from "react";

const brands = [
  "Nike",
  "Apple",
  "Samsung",
  "Adidas",
  "Sony",
  "Puma",
];

export default function SponsorBar() {
  return (
    <div className="mt-24 relative">

      {/* fade edges */}
      <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-black/40 to-transparent z-10" />
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-black/40 to-transparent z-10" />

      {/* viewport */}
      <div className="marquee-container">

        {/* moving track */}
        <div className="marquee-track text-gray-300 text-lg font-semibold">

          {/* first copy */}
          <div className="marquee-group gap-16 px-10">
            {brands.map((brand, i) => (
              <span
                key={`a-${i}`}
                className="hover:text-[#00a6fb] transition whitespace-nowrap"
              >
                {brand}
              </span>
            ))}
          </div>

          {/* second copy */}
          <div className="marquee-group gap-16 px-10">
            {brands.map((brand, i) => (
              <span
                key={`b-${i}`}
                className="hover:text-[#00a6fb] transition whitespace-nowrap"
              >
                {brand}
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
