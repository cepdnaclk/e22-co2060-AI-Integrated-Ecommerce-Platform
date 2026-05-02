import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Quote } from 'lucide-react';
import LeadImg from '/src/assets/yuneth.png';

const LinkedinIcon = () => (
  <svg size={20} viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const GithubIcon = () => (
  <svg size={20} viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const LeaderCard = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative max-w-5xl mx-auto rounded-[32px] p-8 md:p-12 overflow-hidden group"
        >
          {/* Glass Background */}
          <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl border border-white/10 group-hover:bg-white/10 transition-colors duration-500" />

          {/* Glow Effect */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#4DA3FF]/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#1E3A8A]/20 blur-[120px] rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="relative">
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-white/10 group-hover:border-[#4DA3FF] transition-all duration-500 p-2">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img
                    src={LeadImg}
                    alt="Arjun Patel"
                    className="w-full h-full object-top object-cover  transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <span className="inline-block px-4 py-1 rounded-full bg-[#4DA3FF]/10 text-[#4DA3FF] text-xs font-bold uppercase tracking-wider mb-4 border border-[#4DA3FF]/20">
                Team Lead
              </span>
              <h2 className="text-4xl font-bold text-white mb-2">Yuneth Hansira</h2>
              <p className="text-[#4DA3FF] text-xl font-medium mb-6">Project Lead & Full Stack Developer</p>

              <div className="relative mb-8">
                <Quote className="absolute -left-8 -top-4 w-12 h-12 text-white/5" />
                <p className="text-gray-300 text-lg leading-relaxed italic">
                  "Yuneth leads the team with a vision for building scalable solutions and delivering impactful results. He loves turning complex problems into simple, beautiful designs."
                </p>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-4">
                {[
                  { icon: LinkedinIcon, href: "#" },
                  { icon: GithubIcon, href: "#" },
                  { icon: Mail, href: "#" }
                ].map((social, i) => (
                  <motion.a
                    key={i}
                    href={social.href}
                    whileHover={{ y: -5, scale: 1.1 }}
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-[#4DA3FF] hover:border-[#4DA3FF]/50 transition-all"
                  >
                    <social.icon size={20} />
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              <Quote className="w-24 h-24 text-white/5 rotate-180" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LeaderCard;
