import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-morphism rounded-[40px] border border-white/10 p-10 md:p-16 lg:p-20 relative overflow-hidden text-center"
      >
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-blue-500/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[100px] bg-cyan-500/10 blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[100px] bg-purple-500/10 blur-[60px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Stay Updated</h2>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            Get daily alerts on flash deals, new arrivals, and exclusive offers — delivered straight to your inbox.
          </p>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 text-green-400"
            >
              <CheckCircle className="w-12 h-12" />
              <p className="font-bold text-xl">You're subscribed!</p>
              <p className="text-gray-400 text-sm">We'll send you the best deals every day.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-8 py-4 rounded-2xl transition whitespace-nowrap shadow-xl shadow-blue-500/20"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="text-gray-600 text-xs mt-5">No spam. Unsubscribe anytime. We respect your privacy.</p>
        </div>
      </motion.div>
    </section>
  );
}