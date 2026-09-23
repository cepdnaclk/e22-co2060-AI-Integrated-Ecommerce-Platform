import React from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin } from 'lucide-react';

const PARTNERS = [
  { name: 'DHL Express', emoji: '🟡', coverage: '220+ countries' },
  { name: 'FedEx', emoji: '🟣', coverage: 'Overnight delivery' },
  { name: 'UPS', emoji: '🟤', coverage: 'Tracked worldwide' },
  { name: 'Lanka Post', emoji: '🟢', coverage: 'Island-wide SL' },
  { name: 'Aramex', emoji: '🔴', coverage: 'Middle East & Asia' },
  { name: 'Pickme Flash', emoji: '🔵', coverage: 'Same-day Colombo' },
];

export default function DeliveryPartners() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Truck className="w-8 h-8 text-blue-400" /> Delivery Partners
        </h2>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full">
          <MapPin className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-bold">Covering 18+ Countries</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {PARTNERS.map((p, idx) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08 }}
            whileHover={{ y: -4 }}
            className="glass-morphism rounded-2xl p-5 border border-white/5 hover:border-white/20 transition flex flex-col items-center text-center gap-3"
          >
            <span className="text-4xl">{p.emoji}</span>
            <div>
              <p className="font-bold text-sm">{p.name}</p>
              <p className="text-[10px] text-gray-500 mt-1">{p.coverage}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Free shipping over Rs. 5,000', 'Real-time order tracking', 'Same-day delivery available'].map((badge, i) => (
          <div key={i} className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/10 rounded-xl px-5 py-3">
            <span className="text-blue-400 text-lg">✓</span>
            <span className="text-sm font-semibold text-gray-300">{badge}</span>
          </div>
        ))}
      </div>
    </section>
  );
}