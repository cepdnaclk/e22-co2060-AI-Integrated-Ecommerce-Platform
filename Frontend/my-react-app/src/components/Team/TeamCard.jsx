import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const TeamCard = ({ member }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -10 }}
      className="relative group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 transition-all duration-500 hover:bg-white/10 hover:border-[#4DA3FF]/30 overflow-hidden"
    >
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-[#4DA3FF] transition-all duration-300">
            <img
              src={member.image}
              alt={member.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${member.objectPosition || 'object-center'} ${member.imageZoom || 'scale-100'}`}
            />
          </div>
          {/* Status Indicator */}
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-black/20 rounded-full" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#4DA3FF] transition-colors">{member.name}</h3>
        <p className="text-gray-400 text-xs  font-medium mb-6 uppercase tracking-wider">{member.role}</p>

        <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm font-semibold group-hover:bg-[#4DA3FF] group-hover:border-[#4DA3FF] transition-all duration-300">
          View Profile
          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

    </motion.div>
  );
};

export default TeamCard;
