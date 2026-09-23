import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Curated Unsplash images for each collection - no black boxes
const COLLECTIONS = [
  {
    name: 'Gaming Setup',
    desc: 'Level up your battle station',
    bg: 'from-purple-900 via-purple-800 to-indigo-900',
    img: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80',
    query: 'gaming',
    featured: true,
  },
  {
    name: 'Smart Home',
    desc: 'Automate your world',
    bg: 'from-blue-900 via-blue-800 to-cyan-900',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    query: 'home',
  },
  {
    name: 'Photography',
    desc: 'Capture every moment',
    bg: 'from-gray-900 via-zinc-800 to-slate-900',
    img: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80',
    query: 'photography',
  },
  {
    name: 'Fitness',
    desc: 'Train harder. Recover smarter.',
    bg: 'from-green-900 via-emerald-800 to-teal-900',
    img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    query: 'sports',
  },
  {
    name: 'Summer Collection',
    desc: 'Cool gadgets for hot days',
    bg: 'from-orange-900 via-amber-800 to-yellow-900',
    img: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=80',
    query: 'accessories',
  },
  {
    name: 'Office Essentials',
    desc: 'Work smarter from anywhere',
    bg: 'from-slate-900 via-gray-800 to-zinc-900',
    img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80',
    query: 'electronics',
  },
  {
    name: 'Travel',
    desc: 'Pack light. Go anywhere.',
    bg: 'from-sky-900 via-blue-800 to-indigo-900',
    img: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80',
    query: 'accessories',
  },
  {
    name: 'Luxury Collection',
    desc: 'Refined. Elevated. Premium.',
    bg: 'from-yellow-900 via-amber-800 to-orange-900',
    img: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=600&q=80',
    query: 'fashion',
  },
  {
    name: 'Back to School',
    desc: 'Ready for the semester',
    bg: 'from-pink-900 via-rose-800 to-red-900',
    img: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80',
    query: 'books',
  },
];

export default function SpecialCollections() {
  const navigate = useNavigate();
  const featured = COLLECTIONS[0];
  const rest = COLLECTIONS.slice(1);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <h2 className="text-3xl font-extrabold mb-8">Special Collections</h2>

      {/* Featured large banner */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={() => navigate(`/products?category=${featured.query}`)}
        className="cursor-pointer w-full rounded-[40px] overflow-hidden mb-6 relative border border-purple-500/20 shadow-[0_0_60px_rgba(139,92,246,0.2)] group"
        style={{ minHeight: 260 }}
      >
        {/* Background image */}
        <img
          src={featured.img}
          alt={featured.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          onError={e => { e.target.style.display = 'none'; }}
        />
        {/* Dark overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r ${featured.bg} opacity-80`} />

        <div className="relative z-10 p-10 md:p-16 flex items-center justify-between">
          <div>
            <span className="text-purple-300 text-sm font-bold uppercase tracking-widest block mb-2">Featured Collection</span>
            <h3 className="text-5xl font-black text-white mb-3">{featured.name}</h3>
            <p className="text-purple-200 max-w-md mb-6">Build the ultimate battle station. From high-refresh monitors to mechanical keyboards.</p>
            <button className="bg-white text-purple-900 font-bold px-8 py-3 rounded-full flex items-center gap-2 hover:bg-purple-100 transition shadow-xl">
              Explore <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Small banners grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {rest.map((col) => (
          <motion.div
            key={col.name}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => navigate(`/products?category=${col.query}`)}
            className="cursor-pointer rounded-3xl overflow-hidden relative border border-white/5 hover:border-white/20 transition-all group"
            style={{ minHeight: 160 }}
          >
            {/* Background image */}
            <img
              src={col.img}
              alt={col.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              onError={e => { e.target.style.display = 'none'; }}
            />
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${col.bg} opacity-75 group-hover:opacity-65 transition-opacity`} />

            <div className="relative z-10 p-6 h-full flex flex-col justify-end">
              <h3 className="font-extrabold text-white text-lg">{col.name}</h3>
              <p className="text-white/60 text-xs mt-1">{col.desc}</p>
            </div>
            <ArrowRight className="absolute bottom-5 right-5 w-5 h-5 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all z-10" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}