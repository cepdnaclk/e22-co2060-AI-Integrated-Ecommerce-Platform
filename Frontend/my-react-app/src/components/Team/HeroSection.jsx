import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ScrambleText = ({ text }) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+{}:"<>?|;.,';

  useEffect(() => {
    let iteration = 0;
    let interval = null;

    const startScramble = () => {
      clearInterval(interval);
      iteration = 0;
      
      interval = setInterval(() => {
        setDisplayText(prev => 
          text.split("")
            .map((char, index) => {
              if (index < iteration) return text[index];
              if (char === " ") return " ";
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          clearInterval(interval);
          // Start the "Liveness" glitch effect
          startLiveness();
        }
        iteration += 1 / 3;
      }, 30);
    };

    const startLiveness = () => {
      interval = setInterval(() => {
        if (Math.random() > 0.9) { // 10% chance to glitch
          const index = Math.floor(Math.random() * text.length);
          if (text[index] !== " ") {
            setDisplayText(prev => {
              const arr = prev.split("");
              arr[index] = chars[Math.floor(Math.random() * chars.length)];
              setTimeout(() => {
                setDisplayText(text); // Reset after 100ms
              }, 100);
              return arr.join("");
            });
          }
        }
      }, 500);
    };

    startScramble();
    return () => clearInterval(interval);
  }, [text]);

  return <span className="font-mono">{displayText}</span>;
};

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">System Live: Syncing Engineers</span>
            </div>
          </div>
          <span className="text-[#4DA3FF] font-semibold tracking-widest uppercase text-xs mb-4 block">
            <ScrambleText text="THE PEOPLE BEHIND OUR SUCCESS" />
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            <ScrambleText text="Meet Our " /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4DA3FF] to-[#1E3A8A] animate-pulse">
              <ScrambleText text="Team" />
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            A group of passionate innovators, developers and designers working together to build amazing things.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-12 flex justify-center"
        >
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#4DA3FF] to-transparent" />
          <div className="w-3 h-3 rotate-45 border border-[#4DA3FF] mx-4" />
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#4DA3FF] to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
