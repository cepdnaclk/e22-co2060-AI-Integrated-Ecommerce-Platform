import React from "react";

const BRANDS = [
  { name: "Nike",    slug: "nike" },
  { name: "Apple",   slug: "apple" },
  { name: "Samsung", slug: "samsung" },
  { name: "Adidas",  slug: "adidas" },
  { name: "Sony",    slug: "sony" },
  { name: "Puma",    slug: "puma" },
  { name: "Dell",    slug: "dell" },
  { name: "HP",      slug: "hp" },
];

export default function SponsorBar() {
  // Duplicate the array for seamless infinite scroll
  const repeated = [...BRANDS, ...BRANDS, ...BRANDS];

  return (
    <div className="mt-24 relative">
      {/* fade edges */}
      <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-[#021B2D] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#021B2D] to-transparent z-10 pointer-events-none" />

      {/* top & bottom hairline dividers */}
      <div className="border-t border-b border-white/5 py-6 overflow-hidden">
        <div className="marquee-track">
          <div className="marquee-group gap-24 px-12">
            {repeated.map((brand, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-300 w-24"
                title={brand.name}
              >
                <img 
                  src={`https://cdn.simpleicons.org/${brand.slug}/white`} 
                  alt={brand.name}
                  className="h-8 w-auto max-w-full object-contain filter drop-shadow-md"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
