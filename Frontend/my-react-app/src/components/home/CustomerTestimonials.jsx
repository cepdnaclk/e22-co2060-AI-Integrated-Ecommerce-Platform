import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';

const REVIEWS = [
  { id: 1, name: 'Aisha Perera', avatar: 'https://ui-avatars.com/api/?name=Aisha+Perera&background=0D8ABC&color=fff', rating: 5, text: 'BEETA completely changed how I shop online. The AI recommendations are uncannily accurate — it suggested a monitor I had no idea I needed and now it\'s my favorite purchase of the year!', product: 'Dell UltraSharp Monitor', verified: true },
  { id: 2, name: 'Kasun Jayawardena', avatar: 'https://ui-avatars.com/api/?name=Kasun+Jayawardena&background=7C3AED&color=fff', rating: 5, text: 'The seller verification system is excellent. Bought a PS5 DualSense controller and it arrived the next day. Quality, speed, and trust — BEETA delivers on all three.', product: 'PS5 DualSense Controller', verified: true },
  { id: 3, name: 'Nimesha Fernando', avatar: 'https://ui-avatars.com/api/?name=Nimesha+Fernando&background=059669&color=fff', rating: 5, text: 'I was skeptical at first but the price comparison feature alone saved me Rs. 8,000 on my laptop purchase. The interface is beautiful too — feels premium!', product: 'ASUS VivoBook 15', verified: true },
  { id: 4, name: 'Randika Silva', avatar: 'https://ui-avatars.com/api/?name=Randika+Silva&background=DC2626&color=fff', rating: 4, text: 'Returns were so smooth. My keyboard had a dead key and the replacement arrived before I even returned the old one. 10/10 customer experience from BEETA.', product: 'Logitech G915 TKL', verified: true },
];

export default function CustomerTestimonials() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % REVIEWS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const review = REVIEWS[idx];

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-16">
      <div className="text-center mb-12">
        <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">Testimonials</p>
        <h2 className="text-4xl font-extrabold">Loved by Thousands</h2>
      </div>

      <div className="relative max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="glass-morphism rounded-[40px] p-10 border border-white/10 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="flex justify-center mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
              ))}
            </div>

            <p className="text-lg text-gray-300 leading-relaxed italic mb-8">"{review.text}"</p>

            <div className="flex items-center justify-center gap-4">
              <img src={review.avatar} alt={review.name} className="w-12 h-12 rounded-full border-2 border-blue-500/40" />
              <div className="text-left">
                <p className="font-bold flex items-center gap-1.5">
                  {review.name}
                  {review.verified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                </p>
                <p className="text-xs text-gray-500">Verified buyer · {review.product}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        <button
          onClick={() => setIdx(i => (i - 1 + REVIEWS.length) % REVIEWS.length)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 rounded-full glass-morphism border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIdx(i => (i + 1) % REVIEWS.length)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 rounded-full glass-morphism border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {REVIEWS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? 'w-6 h-2 bg-blue-500' : 'w-2 h-2 bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}