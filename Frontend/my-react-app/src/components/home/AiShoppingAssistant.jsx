import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Mic, Camera, DollarSign, Gift, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BUBBLES = [
  { from: 'user', text: 'I need a laptop for video editing under Rs. 150,000' },
  { from: 'ai', text: '✨ I found 3 perfect matches! The ASUS ProArt Studiobook scores 96% on your criteria. Want to compare all three?' },
  { from: 'user', text: 'Yes! Which one has the best display?' },
  { from: 'ai', text: '🖥️ The Dell XPS 15 OLED wins on display quality. 3.5K OLED, 100% DCI-P3 coverage. Currently at Rs. 142,000 — Rs. 8,000 under your budget!' },
];

const FEATURES = [
  { icon: Mic, label: 'Voice Search' },
  { icon: Camera, label: 'Image Search' },
  { icon: DollarSign, label: 'Budget Planning' },
  { icon: Gift, label: 'Gift Suggestions' },
];

export default function AiShoppingAssistant() {
  const navigate = useNavigate();

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-16">
      <div className="glass-morphism rounded-[40px] border border-white/10 overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/5 pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center gap-0">
          {/* Left — Info */}
          <div className="w-full lg:w-5/12 p-10 md:p-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold mb-6">
              <Bot className="w-3.5 h-3.5" /> AI Powered
            </div>
            <h2 className="text-4xl font-extrabold mb-4 leading-tight">
              Your Personal
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">AI Shopping</span>
              Assistant
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              Tell BEETA AI what you need in plain language. It understands your budget, preferences, and usage to find you the perfect product every time.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
                  <f.icon className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-gray-300">{f.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/products')}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-8 py-4 rounded-xl transition flex items-center gap-2 shadow-xl shadow-blue-500/20"
            >
              Try BEETA AI <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right — Chat mockup */}
          <div className="w-full lg:w-7/12 bg-black/30 border-t lg:border-t-0 lg:border-l border-white/5 p-8 md:p-10 space-y-4 min-h-[400px] flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">BEETA AI</p>
                <p className="text-[10px] text-green-400 font-semibold">● Online</p>
              </div>
            </div>

            {BUBBLES.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: b.from === 'user' ? 20 : -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className={`flex ${b.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  b.from === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white/5 border border-white/10 text-gray-300 rounded-bl-md'
                }`}>
                  {b.text}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}