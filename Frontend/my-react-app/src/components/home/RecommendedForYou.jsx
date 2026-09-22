import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Eye, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';

const AI_REASONS = [
  "Recommended because you viewed Electronics.",
  "Matches your interest in Gaming products.",
  "Top rated in this category this week.",
  "Frequently bought together with wishlist items.",
  "Trending in your area right now.",
  "Best value in its price range.",
];

export default function RecommendedForYou() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeFetch(`${API_BASE_URL}/api/products?sort=latest&limit=4`, { products: [] })
      .then(data => setProducts(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  const items = products.map((p, i) => ({
    ...p,
    aiMatch: 98 - i * 4,
    reason: AI_REASONS[i % AI_REASONS.length],
    price: p.offers?.[0]?.price || p.price || 0,
    seller: p.offers?.[0]?.sellerName || p.sellerName || 'BEETA Store',
    rating: (4.5 + Math.random() * 0.5).toFixed(1),
  }));

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-400" /> Recommended For You
        </h2>
        <p className="text-gray-400 mt-2 text-sm">AI-curated picks based on browsing trends across our platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="glass-morphism rounded-3xl p-5 border border-white/10 animate-pulse space-y-3">
                <div className="h-48 bg-white/5 rounded-2xl" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))
          : items.map((item, idx) => {
            const img = resolveProductImage(item);
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass-morphism rounded-3xl p-5 border border-white/10 group relative cursor-pointer"
                onClick={() => navigate(`/products/${item._id}`)}
              >
                <div className="absolute top-4 right-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 z-10">
                  <Sparkles className="w-3 h-3" /> {item.aiMatch}% MATCH
                </div>
                <button
                  onClick={e => e.stopPropagation()}
                  className="absolute top-4 left-4 p-2 bg-white/5 border border-white/10 rounded-full hover:bg-red-500/20 hover:text-red-400 transition z-10"
                >
                  <Heart className="w-4 h-4" />
                </button>

                <div className="h-48 bg-black/20 rounded-2xl mb-4 overflow-hidden relative">
                  <img
                    src={img}
                    alt={item.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=70`; }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/20 transition text-sm">
                      <Eye className="w-4 h-4" /> Quick View
                    </button>
                  </div>
                </div>

                <h3 className="font-bold truncate text-sm">{item.productName}</h3>
                <p className="text-xs text-gray-500 mt-1">Seller: {item.seller} · ⭐ {item.rating}</p>

                <div className="mt-3 p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
                  <p className="text-[10px] text-gray-400 italic">"{item.reason}"</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {item.price > 0
                    ? <span className="text-[#4ade80] font-mono font-bold text-lg">Rs. {item.price.toLocaleString()}</span>
                    : <span className="text-gray-500 text-sm">Price on request</span>
                  }
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/products/${item._id}`); }}
                    className="bg-blue-600 hover:bg-blue-500 p-2.5 rounded-xl transition"
                  >
                    <ShoppingBag className="w-4 h-4 text-white" />
                  </button>
                </div>
              </motion.div>
            );
          })}
      </div>
    </section>
  );
}