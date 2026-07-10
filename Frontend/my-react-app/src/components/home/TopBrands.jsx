import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveBrandImage, safeFetch, API_BASE_URL } from './homeUtils.js';

const KNOWN_BRANDS = ['Apple', 'Samsung', 'Sony', 'Dell', 'HP', 'ASUS', 'Nike', 'Adidas'];

const BRAND_EMOJIS = {
  apple: '🍎', samsung: '📱', sony: '🎮', dell: '💻',
  hp: '🖨️', asus: '🔧', nike: '👟', adidas: '👕',
};

export default function TopBrands() {
  const navigate = useNavigate();
  const [brandData, setBrandData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products grouped by brand from the API
    safeFetch(`${API_BASE_URL}/api/products?limit=50`, { products: [] })
      .then(data => {
        const products = data.products || [];
        // Count products per known brand
        const map = {};
        products.forEach(p => {
          const brand = (p.brand || '').toLowerCase();
          KNOWN_BRANDS.forEach(b => {
            if (brand.includes(b.toLowerCase())) {
              if (!map[b]) map[b] = { name: b, count: 0, img: resolveBrandImage(b) };
              map[b].count++;
            }
          });
        });
        // Ensure all known brands appear even if 0 products
        const result = KNOWN_BRANDS.map(b => map[b] || { name: b, count: 0, img: resolveBrandImage(b) });
        setBrandData(result);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <h2 className="text-3xl font-extrabold mb-8">Top Brands</h2>
      <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {loading
          ? [...Array(6)].map((_, i) => (
              <div key={i} className="min-w-[280px] glass-morphism rounded-3xl p-6 border border-white/10 animate-pulse flex gap-6 items-center">
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))
          : brandData.map((brand, idx) => (
              <motion.div
                key={brand.name}
                whileHover={{ y: -5 }}
                onClick={() => navigate(`/products?search=${brand.name}`)}
                className="min-w-[280px] glass-morphism rounded-3xl border border-white/10 flex items-center overflow-hidden cursor-pointer hover:border-blue-500/30 transition group"
              >
                {/* Brand image left side */}
                <div className="w-28 h-28 flex-shrink-0 relative overflow-hidden">
                  <img
                    src={brand.img}
                    alt={brand.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={e => { e.target.onerror = null; e.target.style.display='none'; }}
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                {/* Brand info */}
                <div className="px-5 flex-1">
                  <h3 className="font-bold text-xl flex items-center gap-1.5">
                    <span className="text-2xl">{BRAND_EMOJIS[brand.name.toLowerCase()] || '🏷️'}</span>
                    {brand.name}
                    <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {brand.count > 0 ? `${brand.count} Products` : 'Latest Arrivals'}
                  </p>
                  <p className="text-xs text-blue-400 mt-1 font-semibold group-hover:underline">Shop Now →</p>
                </div>
              </motion.div>
            ))}
      </div>
    </section>
  );
}