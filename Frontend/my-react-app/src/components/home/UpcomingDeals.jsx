import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Lock, Clock } from 'lucide-react';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';
import { useNavigate } from 'react-router-dom';

function useCountdown(initial) {
  const [t, setT] = useState(initial);
  useEffect(() => {
    const timer = setInterval(() => setT(prev => {
      let { h, m, s } = prev;
      if (s > 0) s--;
      else { s = 59; if (m > 0) m--; else { m = 59; if (h > 0) h--; } }
      return { h, m, s };
    }), 1000);
    return () => clearInterval(timer);
  }, []);
  return t;
}

function UpcomingCard({ item, offset }) {
  const navigate = useNavigate();
  const t = useCountdown({ h: offset, m: Math.floor(Math.random() * 60), s: 0 });
  const [notified, setNotified] = useState(false);
  const img = resolveProductImage(item, item.offer);
  const price = item.offer?.price || item.price || 0;
  const discount = item.offer?.discountPercentage || item.discountPercentage || 10;

  return (
    <motion.div whileHover={{ y: -5 }} className="glass-morphism rounded-3xl p-6 border border-white/10 hover:border-blue-500/30 relative overflow-hidden group cursor-pointer"
      onClick={() => navigate(`/products/${item._id || item.product?._id}`)}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/10 pointer-events-none" />
      <div className="h-36 bg-black/40 rounded-2xl mb-5 flex items-center justify-center overflow-hidden relative">
        <Lock className="absolute inset-0 m-auto w-8 h-8 text-white/10 z-10" />
        <img
          src={img}
          alt={item.productName || item.product?.productName}
          className="w-full h-full object-cover opacity-40 blur-sm group-hover:opacity-60 transition-all duration-500"
          onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=70`; }}
        />
        <div className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded z-20">-{discount}%</div>
      </div>
      <h3 className="font-bold line-clamp-1 mb-2">{item.productName || item.product?.productName}</h3>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-xs text-gray-400 font-semibold">Starts in:</span>
        <span className="font-mono font-bold text-orange-400">
          {String(t.h).padStart(2,'0')}:{String(t.m).padStart(2,'0')}:{String(t.s).padStart(2,'0')}
        </span>
      </div>
      {price > 0 && (
        <div className="text-[#4ade80] font-mono font-bold mb-4">
          Rs. {Math.round(price * (1 - discount / 100)).toLocaleString()}
          <span className="text-gray-500 line-through text-sm ml-2">Rs. {price.toLocaleString()}</span>
        </div>
      )}
      <button
        onClick={e => { e.stopPropagation(); setNotified(true); }}
        className={`w-full py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
          notified
            ? 'bg-green-500/20 border border-green-500/30 text-green-400 cursor-default'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        <Bell className="w-4 h-4" />
        {notified ? 'Notified ✓' : 'Notify Me'}
      </button>
    </motion.div>
  );
}

export default function UpcomingDeals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use products with lowest stock as "upcoming deals"
    safeFetch(`${API_BASE_URL}/api/products?sort=latest&limit=3`, { products: [] })
      .then(data => setItems(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Clock className="w-8 h-8 text-orange-400" /> Upcoming Deals
        </h2>
        <p className="text-gray-400 mt-2 text-sm">Set reminders for these limited-time offers before they go live.</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-morphism rounded-3xl p-6 border border-white/10 animate-pulse space-y-4">
              <div className="h-36 bg-white/5 rounded-2xl" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
              <div className="h-10 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, i) => <UpcomingCard key={item._id} item={item} offset={2 + i * 3} />)}
        </div>
      )}
    </section>
  );
}