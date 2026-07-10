import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, ShoppingBag, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';

export default function TrendingThisWeek() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the most sold product as the "trending" showcase
    safeFetch(`${API_BASE_URL}/api/products?sort=popular&limit=1`, { products: [] })
      .then(data => {
        const p = (data.products || [])[0];
        if (p) setFeatured(p);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
        <h2 className="text-3xl font-extrabold flex items-center gap-2 mb-8">
          <TrendingUp className="w-8 h-8 text-cyan-400" /> Trending This Week
        </h2>
        <div className="glass-morphism rounded-[40px] p-8 border border-white/10 animate-pulse h-64" />
      </section>
    );
  }

  if (!featured) return null;

  const img = resolveProductImage(featured);
  const price = featured.offers?.[0]?.price || featured.price || 0;
  const sold = featured.howManyProductsSold || 0;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <h2 className="text-3xl font-extrabold flex items-center gap-2 mb-8">
        <TrendingUp className="w-8 h-8 text-cyan-400" /> Trending This Week
      </h2>
      <div className="glass-morphism rounded-[40px] p-8 border border-white/10 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="w-full md:w-1/2">
          <img
            src={img}
            alt={featured.productName}
            className="w-full rounded-2xl shadow-2xl max-h-72 object-cover"
            onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80`; }}
          />
        </div>

        <div className="w-full md:w-1/2 space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/20">
            <TrendingUp className="w-3 h-3" /> #1 VIRAL
          </div>
          <h3 className="text-3xl md:text-4xl font-black">{featured.productName}</h3>
          {featured.description && (
            <p className="text-gray-400 line-clamp-2">{featured.description}</p>
          )}

          <div className="flex gap-6 py-4 border-y border-white/10">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Sold</p>
              <p className="text-xl font-mono font-bold text-white flex items-center gap-1">
                <ShoppingBag className="w-4 h-4 text-green-400" /> {sold.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Brand</p>
              <p className="text-xl font-bold text-white">{featured.brand || 'Premium'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Category</p>
              <p className="text-xl font-bold text-white">{featured.category}</p>
            </div>
          </div>

          {price > 0 && (
            <div className="text-2xl font-black text-[#4ade80] font-mono">Rs. {price.toLocaleString()}</div>
          )}

          <button
            onClick={() => navigate(`/products/${featured._id}`)}
            className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-4 rounded-xl transition shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            Explore Trend
          </button>
        </div>
      </div>
    </section>
  );
}