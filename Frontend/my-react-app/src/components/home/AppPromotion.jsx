import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Download, QrCode } from 'lucide-react';

export default function AppPromotion() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-16">
      <div className="bg-gradient-to-br from-[#021B2D] via-[#0a2744] to-[#021B2D] rounded-[40px] border border-white/10 overflow-hidden relative">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[80px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-center gap-10 p-10 md:p-14">
          {/* Left */}
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-gray-300 mb-6">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" /> BEETA Mobile App
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              Shop Smarter
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">On the Go</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8 max-w-md">
              Download the BEETA app and get access to exclusive mobile-only deals, push notifications for flash sales, and seamless one-tap checkout.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              {/* Google Play */}
              <a href="#" className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 px-5 py-3 rounded-2xl transition group">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                  <path d="M3 20.5v-17c0-.7.8-1.1 1.4-.7l15 8.5a.8.8 0 0 1 0 1.4l-15 8.5c-.6.4-1.4 0-1.4-.7Z" fill="#4ade80" />
                </svg>
                <div>
                  <p className="text-[10px] text-gray-500">Get it on</p>
                  <p className="font-bold text-sm leading-none">Google Play</p>
                </div>
              </a>

              {/* App Store */}
              <a href="#" className="flex items-center gap-3 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 px-5 py-3 rounded-2xl transition group">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                  <path d="M18.7 12.4c0-2.9 2.4-4.3 2.5-4.4-1.4-2-3.5-2.3-4.2-2.3-1.8-.2-3.4 1-4.3 1s-2.3-1-3.8-1c-1.9 0-3.7 1.1-4.7 2.9-2 3.5-.5 8.6 1.4 11.5 1 1.4 2.1 2.9 3.6 2.9 1.4-.1 2-.9 3.7-.9s2.2.9 3.7.8c1.6 0 2.6-1.4 3.5-2.8.7-1 1-2 1.2-2.1-.1 0-2.6-1-2.6-3.6Z" fill="#fff" />
                  <path d="M15.7 3.4c.8-1 1.3-2.3 1.2-3.7-1.2.1-2.6.8-3.4 1.8-.7.9-1.4 2.2-1.2 3.5 1.3.1 2.6-.6 3.4-1.6Z" fill="#fff" />
                </svg>
                <div>
                  <p className="text-[10px] text-gray-500">Download on the</p>
                  <p className="font-bold text-sm leading-none">App Store</p>
                </div>
              </a>
            </div>

            {/* QR code */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center">
                <QrCode className="w-12 h-12 text-[#021B2D]" />
              </div>
              <p className="text-xs text-gray-500">Scan to download the<br /><span className="text-gray-300 font-semibold">BEETA App</span></p>
            </div>
          </div>

          {/* Right — Phone mockup */}
          <div className="flex-1 flex justify-center relative z-10">
            <div className="relative">
              {/* Phone frame */}
              <div className="w-64 h-[500px] bg-[#0a1628] rounded-[40px] border-2 border-white/20 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
                <div className="w-full h-full bg-gradient-to-b from-[#021B2D] to-[#0a1628] p-4 pt-10">
                  {/* Mini app UI */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-blue-400">BEETA</span>
                    <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/30" />
                  </div>
                  <div className="text-xs text-gray-400 mb-3">Flash Deals 🔥</div>
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white/5 rounded-xl p-3 flex gap-3 border border-white/5">
                        <div className="w-10 h-10 bg-white/10 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <div className="w-3/4 h-2 bg-white/20 rounded mb-1" />
                          <div className="w-1/2 h-2 bg-green-500/40 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-blue-600 text-white text-xs font-bold py-2 rounded-xl text-center">Shop Now</div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute -top-4 -right-6 bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-4 py-2 shadow-xl"
              >
                <p className="text-xs font-bold text-white">⚡ Flash Sale!</p>
                <p className="text-[10px] text-green-400">-40% Today Only</p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                className="absolute -bottom-4 -left-6 bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-4 py-2 shadow-xl"
              >
                <p className="text-xs font-bold text-white">📦 Order Delivered</p>
                <p className="text-[10px] text-blue-400">Track your package</p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}