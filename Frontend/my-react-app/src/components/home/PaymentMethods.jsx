import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock } from 'lucide-react';

const METHODS = [
  { name: 'Visa', emoji: '💳', color: 'text-blue-400' },
  { name: 'Mastercard', emoji: '🔵', color: 'text-orange-400' },
  { name: 'PayPal', emoji: '🅿️', color: 'text-blue-500' },
  { name: 'Apple Pay', emoji: '🍎', color: 'text-gray-300' },
  { name: 'Google Pay', emoji: '🔺', color: 'text-green-400' },
  { name: 'Stripe', emoji: '⚡', color: 'text-purple-400' },
  { name: 'Bank Transfer', emoji: '🏦', color: 'text-yellow-400' },
  { name: 'Cash on Delivery', emoji: '💵', color: 'text-green-300' },
];

export default function PaymentMethods() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Lock className="w-7 h-7 text-green-400" /> Payment Methods
        </h2>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-bold">256-bit SSL Encrypted</span>
        </div>
      </div>

      <div className="glass-morphism rounded-3xl border border-white/10 p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {METHODS.map((m, idx) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ y: -4, scale: 1.05 }}
              className="flex flex-col items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-4 transition cursor-default"
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className={`text-[10px] font-bold ${m.color}`}>{m.name}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {['PCI DSS Compliant', '3D Secure', 'Fraud Protection', 'Encrypted Transactions'].map(b => (
            <span key={b} className="text-xs font-semibold text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-green-500" /> {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}