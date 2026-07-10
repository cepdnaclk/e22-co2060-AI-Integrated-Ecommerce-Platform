import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';

const FILTERS = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: 'This Week' },
];

function msToDays(ms) { return ms / (1000 * 60 * 60 * 24); }

export default function RecentlyAdded() {
  const navigate = useNavigate();
  const [active, setActive] = useState('today');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeFetch(`${API_BASE_URL}/api/products?sort=latest&limit=20`, { products: [] })
      .then(data => setAllProducts(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const filtered = allProducts.filter(p => {
    const age = msToDays(now - new Date(p.createdAt).getTime());
    if (active === 'today')     return age < 1;
    if (active === 'yesterday') return age >= 1 && age < 2;
    if (active === 'week')      return age < 7;
    return true;
  });

  // Always show some items even if nothing was added that recently
  const displayed = filtered.length > 0 ? filtered : allProducts.slice(0, 8);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Clock className="w-8 h-8 text-green-400" /> Recently Added
        </h2>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={`px-5 py-2 rounded-full text-sm font-bold border transition-all ${
                active === f.key
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 border-blue-400/40 text-white shadow-lg'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-morphism rounded-3xl p-5 border border-white/10 animate-pulse space-y-3">
              <div className="h-36 bg-white/5 rounded-2xl" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {displayed.slice(0, 8).map((item, idx) => {
              const img = resolveProductImage(item);
              const price = item.offers?.[0]?.price || item.price || 0;
              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className="glass-morphism rounded-3xl p-5 border border-white/10 hover:border-green-500/30 group relative cursor-pointer"
                  onClick={() => navigate(`/products/${item._id}`)}
                >
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-gradient-to-r from-green-500 to-emerald-400 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">NEW</span>
                  </div>
                  <div className="h-36 bg-black/30 rounded-2xl mb-4 overflow-hidden">
                    <img
                      src={img}
                      alt={item.productName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=70`; }}
                    />
                  </div>
                  <h3 className="font-bold text-sm line-clamp-1 group-hover:text-green-400 transition-colors">{item.productName}</h3>
                  <div className="flex items-center justify-between mt-3">
                    {price > 0
                      ? <span className="text-[#4ade80] font-mono font-bold">Rs. {price.toLocaleString()}</span>
                      : <span className="text-gray-500 text-xs">Price on request</span>
                    }
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/products/${item._id}`); }}
                      className="bg-white/10 hover:bg-green-500/20 p-2 rounded-xl transition border border-white/10"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}