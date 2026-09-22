import React from 'react';
import { motion } from 'framer-motion';
import { Bot, ShieldCheck, Truck, Lock, RefreshCw, BarChart2, Package, Star } from 'lucide-react';

const FEATURES = [
  { icon: Bot, title: 'AI Shopping Assistant', desc: 'Smart recommendations powered by machine learning tailored to your taste.', color: 'text-blue-400', glow: 'rgba(59,130,246,0.15)' },
  { icon: ShieldCheck, title: 'Verified Sellers', desc: 'Every seller is background-checked and certified before listing products.', color: 'text-green-400', glow: 'rgba(74,222,128,0.15)' },
  { icon: Truck, title: 'Fast Delivery', desc: 'Same-day delivery available in major cities. Track orders in real time.', color: 'text-cyan-400', glow: 'rgba(34,211,238,0.15)' },
  { icon: Lock, title: 'Secure Payments', desc: '256-bit SSL encryption. PCI-DSS compliant. Your data is always safe.', color: 'text-purple-400', glow: 'rgba(192,132,252,0.15)' },
  { icon: RefreshCw, title: 'Easy Returns', desc: '30-day hassle-free returns with free pickup from your doorstep.', color: 'text-rose-400', glow: 'rgba(251,113,133,0.15)' },
  { icon: BarChart2, title: 'Price Comparison', desc: "Compare prices across verified sellers to always find the best deal.", color: 'text-yellow-400', glow: 'rgba(250,204,21,0.15)' },
  { icon: Package, title: 'Live Inventory', desc: 'Real-time stock updates so you never miss a product in demand.', color: 'text-orange-400', glow: 'rgba(251,146,60,0.15)' },
  { icon: Star, title: 'Real Reviews', desc: 'Only verified buyers can post reviews. Authentic, honest feedback.', color: 'text-teal-400', glow: 'rgba(45,212,191,0.15)' },
];

export default function WhyShopBeeta() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-16">
      <div className="text-center mb-14">
        <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">Why BEETA</p>
        <h2 className="text-4xl font-extrabold">Built for Smarter Shopping</h2>
        <p className="text-gray-400 mt-3 max-w-xl mx-auto">Every feature designed to save you time, money, and effort — powered by AI.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((f, idx) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.07 }}
            whileHover={{ scale: 1.03 }}
            className="glass-morphism rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all group relative overflow-hidden"
            style={{ boxShadow: `0 0 0 0 ${f.glow}` }}
          >
            {/* Glow bg */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" style={{ background: `radial-gradient(circle at center, ${f.glow} 0%, transparent 70%)` }} />

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-white/5 border border-white/5 ${f.color} group-hover:scale-110 transition-transform duration-300`}>
              <f.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-white transition-colors">{f.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}