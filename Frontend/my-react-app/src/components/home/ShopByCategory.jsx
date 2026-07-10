import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Shirt, Gamepad2, Book, Sparkles, Dumbbell, Sofa, Home, Utensils, Headphones, Dog, Puzzle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveCategoryImage, safeFetch, API_BASE_URL } from './homeUtils.js';

const CATEGORY_META = [
  { name: 'Electronics', icon: Monitor, color: 'from-blue-500 to-cyan-400' },
  { name: 'Fashion',     icon: Shirt,    color: 'from-purple-500 to-pink-400' },
  { name: 'Gaming',      icon: Gamepad2, color: 'from-green-500 to-emerald-400' },
  { name: 'Books',       icon: Book,     color: 'from-yellow-500 to-orange-400' },
  { name: 'Beauty',      icon: Sparkles, color: 'from-rose-500 to-red-400' },
  { name: 'Sports',      icon: Dumbbell, color: 'from-cyan-500 to-blue-500' },
  { name: 'Furniture',   icon: Sofa,     color: 'from-amber-500 to-orange-500' },
  { name: 'Home',        icon: Home,     color: 'from-teal-500 to-emerald-500' },
  { name: 'Kitchen',     icon: Utensils, color: 'from-red-500 to-rose-500' },
  { name: 'Accessories', icon: Headphones, color: 'from-indigo-500 to-purple-500' },
  { name: 'Pets',        icon: Dog,      color: 'from-orange-500 to-amber-500' },
  { name: 'Toys',        icon: Puzzle,   color: 'from-pink-500 to-rose-500' },
];

export default function ShopByCategory() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    // Fetch counts from the deals categories endpoint (which uses actual DB data)
    safeFetch(`${API_BASE_URL}/api/deals/categories`, { categories: [] })
      .then(data => {
        const map = {};
        (data.categories || []).forEach(c => { map[c.name] = c.count; });
        setCounts(map);
      });
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <h2 className="text-3xl font-extrabold mb-8">Shop By Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {CATEGORY_META.map((cat, idx) => {
          const img = resolveCategoryImage(cat.name);
          const count = counts[cat.name];
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.05, y: -4 }}
              onClick={() => navigate(`/products?category=${cat.name.toLowerCase()}`)}
              className="cursor-pointer relative group glass-morphism rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all"
              style={{ minHeight: 140 }}
            >
              {/* Background image */}
              <img
                src={img}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity duration-500 scale-110 group-hover:scale-100"
                onError={e => { e.target.style.display = 'none'; }}
              />
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-40 group-hover:opacity-60 transition-opacity`} />
              {/* Content */}
              <div className="relative z-10 p-5 flex flex-col items-center justify-center text-center gap-2 h-full">
                <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur flex items-center justify-center border border-white/10">
                  <cat.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-sm text-white drop-shadow">{cat.name}</h3>
                {count !== undefined && (
                  <p className="text-[10px] text-white/70">{count}+ Products</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}