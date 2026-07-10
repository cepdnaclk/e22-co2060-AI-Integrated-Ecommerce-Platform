import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';

export default function BestSellers() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch most-sold products from the standard products endpoint (sort by howManyProductsSold)
    safeFetch(`${API_BASE_URL}/api/products?sort=popular&limit=8`, { products: [] })
      .then(data => setProducts(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Flame className="w-8 h-8 text-orange-500 fill-orange-500" /> Today's Best Sellers
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="glass-morphism rounded-3xl p-4 border border-white/10 animate-pulse space-y-3">
                <div className="h-40 bg-white/5 rounded-2xl" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-6 bg-white/5 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="flex-1 h-8 bg-white/5 rounded-xl" />
                  <div className="flex-1 h-8 bg-white/5 rounded-xl" />
                </div>
              </div>
            ))
          : products.slice(0, 8).map((item, i) => {
            const img = resolveProductImage(item);
            const sold = item.howManyProductsSold || Math.floor(Math.random() * 1000 + 100);
            const price = item.offers?.[0]?.price || item.price || 0;
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -5 }}
                className="glass-morphism rounded-3xl p-4 border border-white/10 group cursor-pointer"
                onClick={() => navigate(`/products/${item._id}`)}
              >
                <div className="h-40 bg-black/30 rounded-2xl mb-4 overflow-hidden relative">
                  <img
                    src={img}
                    alt={item.productName}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=70`; }}
                  />
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                    <Flame className="w-3 h-3" /> HOT
                  </div>
                </div>
                <h3 className="font-bold truncate text-sm">{item.productName}</h3>
                <div className="flex justify-between items-center mt-2">
                  {price > 0
                    ? <span className="text-[#4ade80] font-mono font-bold text-sm">Rs. {price.toLocaleString()}</span>
                    : <span className="text-gray-500 text-xs">Price on request</span>
                  }
                  <span className="text-xs text-gray-400">🔥 {sold.toLocaleString()} sold</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/products/${item._id}`); }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold transition"
                  >
                    View Details
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/products/${item._id}`); }}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <ShoppingCart className="w-3 h-3" /> Buy Now
                  </button>
                </div>
              </motion.div>
            );
          })}
      </div>
    </section>
  );
}