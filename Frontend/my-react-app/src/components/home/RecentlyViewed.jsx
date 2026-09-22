import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';

export default function RecentlyViewed() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Load recently viewed product IDs from localStorage
    const ids = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    if (ids.length === 0) {
      // Fallback: show newest products
      safeFetch(`${API_BASE_URL}/api/products?sort=latest&limit=5`, { products: [] })
        .then(data => setProducts(data.products || []));
      return;
    }
    // Fetch details for each viewed product
    Promise.all(ids.slice(0, 6).map(id =>
      safeFetch(`${API_BASE_URL}/api/products/${id}`, null)
    )).then(results => setProducts(results.filter(Boolean)));
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold flex items-center gap-2">
          <History className="w-6 h-6 text-gray-400" /> Recently Viewed
        </h2>
        <button
          onClick={() => navigate('/products')}
          className="text-blue-400 hover:text-blue-300 font-semibold transition text-sm flex items-center gap-1"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {products.map((item, i) => {
          const img = resolveProductImage(item);
          const price = item.offers?.[0]?.price || item.price || 0;
          return (
            <motion.div
              key={item._id}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/products/${item._id}`)}
              className="min-w-[160px] cursor-pointer glass-morphism rounded-2xl p-4 border border-white/5 hover:border-white/20 transition group"
            >
              <div className="h-24 bg-black/30 rounded-xl mb-3 overflow-hidden">
                <img
                  src={img}
                  alt={item.productName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400"
                  onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=300&q=70`; }}
                />
              </div>
              <h4 className="text-xs font-bold truncate">{item.productName}</h4>
              {price > 0 && <p className="text-[#4ade80] text-xs font-mono font-bold mt-1">Rs. {price.toLocaleString()}</p>}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}