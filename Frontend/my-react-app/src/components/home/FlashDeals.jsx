import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ShoppingBag, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';

const Skeleton = () => (
  <div className="min-w-[300px] glass-morphism rounded-3xl p-5 border border-white/10 animate-pulse space-y-4">
    <div className="h-40 bg-white/5 rounded-2xl" />
    <div className="h-4 bg-white/5 rounded w-3/4" />
    <div className="h-6 bg-white/5 rounded w-1/2" />
    <div className="h-3 bg-white/5 rounded w-full" />
    <div className="h-10 bg-white/5 rounded-xl" />
  </div>
);

export default function FlashDeals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 11, minutes: 59, seconds: 59 });

  useEffect(() => {
    safeFetch(`${API_BASE_URL}/api/deals?limit=6&sort=discount_desc&minDiscount=1`, { deals: [] })
      .then(data => setDeals(data.deals || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else { seconds = 59; if (minutes > 0) minutes--; else { minutes = 59; if (hours > 0) hours--; } }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-extrabold flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            Flash Deals
          </h2>
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-400 font-mono font-bold">
            <Clock className="w-4 h-4" />
            <span>{String(timeLeft.hours).padStart(2,'0')}:{String(timeLeft.minutes).padStart(2,'0')}:{String(timeLeft.seconds).padStart(2,'0')}</span>
          </div>
        </div>
        <button onClick={() => navigate('/deals')} className="text-blue-400 hover:text-blue-300 font-semibold transition">View All Deals &rarr;</button>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {loading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} />)
          : deals.length === 0
            ? <p className="text-gray-500 py-8">No flash deals available right now. Check back soon!</p>
            : deals.map(({ product, offer }) => {
              const img = resolveProductImage(product, offer);
              const sold = product.howManyProductsSold || 0;
              const total = Math.max(sold + (offer.stock || 10), 50);
              const pct = Math.min(100, Math.round((sold / total) * 100));

              return (
                <motion.div
                  key={product._id}
                  whileHover={{ y: -5 }}
                  className="min-w-[300px] glass-morphism rounded-3xl p-5 border border-white/10 relative group cursor-pointer"
                  onClick={() => navigate(`/products/${product._id}`)}
                >
                  <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{offer.discountPercentage}%
                  </div>
                  <div className="h-40 overflow-hidden rounded-2xl mb-4 bg-slate-900">
                    <img
                      src={img}
                      alt={product.productName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=70`; }}
                    />
                  </div>
                  <h3 className="font-bold text-lg mb-1 truncate">{product.productName}</h3>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-[#4ade80] font-mono font-bold text-xl">Rs. {offer.finalPrice.toLocaleString()}</span>
                    <span className="text-gray-500 line-through text-sm">Rs. {offer.originalPrice.toLocaleString()}</span>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{sold} Sold</span>
                      <span>{offer.stock} Left</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/products/${product._id}`); }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> Shop Now
                  </button>
                </motion.div>
              );
            })}
      </div>
    </section>
  );
}