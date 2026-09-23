import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const TeamNavbar = () => {
  const menuItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Projects', path: '/products' },
    { name: 'Team', path: '/team' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-[#0b1c2d]/80 backdrop-blur-lg border-b border-white/10">
      <Link to="/" className="text-2xl font-bold text-white tracking-wide">
        BEETA
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`text-sm font-medium transition-colors hover:text-[#4DA3FF] ${
              item.name === 'Team' ? 'text-[#4DA3FF] relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-[#4DA3FF]' : 'text-gray-300'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-2.5 bg-gradient-to-r from-[#1E3A8A] to-[#4DA3FF] text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow"
      >
        Get in Touch
      </motion.button>
    </nav>
  );
};

export default TeamNavbar;
