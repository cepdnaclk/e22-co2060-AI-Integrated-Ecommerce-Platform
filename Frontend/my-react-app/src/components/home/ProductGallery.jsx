import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveProductImage, safeFetch, API_BASE_URL } from './homeUtils.js';

export default function ProductGallery() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeFetch(`${API_BASE_URL}/api/products?sort=latest&limit=12`, { products: [] })
      .then(data => setProducts(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  // Stagger heights for masonry feel
  const heights = ['h-48', 'h-64', 'h-56', 'h-48', 'h-60', 'h-52',
                   'h-56', 'h-48', 'h-64', 'h-52', 'h-60', 'h-48'];

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="mb-8 text-center">
        <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">Gallery</p>
        <h2 className="text-3xl font-extrabold">Product Showcase</h2>
        <p className="text-gray-400 mt-2">Explore our premium catalog in full visual detail.</p>
      </div>

      {loading ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="break-inside-avoid mb-4 rounded-2xl bg-white/5 animate-pulse" style={{ height: `${140 + (i % 3) * 40}px` }} />
          ))}
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
          {products.map((item, idx) => {
            const img = resolveProductImage(item);
            const price = item.offers?.[0]?.price || item.price || 0;
            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="break-inside-avoid mb-4 relative group cursor-pointer"
                onClick={() => setSelected(item)}
              >
                <div className={`relative overflow-hidden rounded-2xl border border-white/5 ${heights[idx % heights.length]}`}>
                  <img
                    src={img}
                    alt={item.productName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&q=70`; }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-end gap-2 p-4 backdrop-blur-sm">
                    <p className="text-white font-bold text-sm w-full text-left line-clamp-1">{item.productName}</p>
                    {price > 0 && <p className="text-[#4ade80] text-xs font-mono font-bold w-full text-left">Rs. {price.toLocaleString()}</p>}
                    <div className="flex gap-2 w-full">
                      <button className="flex-1 bg-white/10 border border-white/20 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-white/20 transition">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/products/${item._id}`); }}
                        className="flex-1 bg-blue-600 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-blue-500 transition"
                      >
                        <ShoppingBag className="w-3 h-3" /> Buy
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 bg-[#0b182d] border border-white/10 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 bg-white/10 p-2 rounded-full hover:bg-white/20 transition z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={resolveProductImage(selected)}
                alt={selected.productName}
                className="w-full h-64 object-cover"
                onError={e => { e.target.onerror = null; e.target.src = `https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80`; }}
              />
              <div className="p-6">
                <h3 className="font-extrabold text-xl mb-1">{selected.productName}</h3>
                {selected.brand && <p className="text-sm text-gray-400 mb-3">by {selected.brand}</p>}
                {selected.description && <p className="text-sm text-gray-300 line-clamp-2 mb-4">{selected.description}</p>}
                <button
                  onClick={() => { navigate(`/products/${selected._id}`); setSelected(null); }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> View Product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}