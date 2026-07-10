import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetDir = path.resolve(__dirname, '../../../Frontend/my-react-app/src/components/home');

const components = {
  'FlashDeals.jsx': `
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ShoppingBag, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FLASH_DEALS = [
  { id: '1', name: 'Razer Blade 15 Advanced', image: 'https://placehold.co/400x400/111/fff?text=Razer', price: 299900, originalPrice: 350000, discount: 14, sold: 85, total: 100 },
  { id: '2', name: 'Sony WH-1000XM5', image: 'https://placehold.co/400x400/111/fff?text=Sony', price: 45000, originalPrice: 55000, discount: 18, sold: 120, total: 150 },
  { id: '3', name: 'Samsung Galaxy S24 Ultra', image: 'https://placehold.co/400x400/111/fff?text=S24', price: 180000, originalPrice: 220000, discount: 18, sold: 45, total: 50 },
  { id: '4', name: 'Apple Watch Ultra 2', image: 'https://placehold.co/400x400/111/fff?text=AppleWatch', price: 105000, originalPrice: 125000, discount: 16, sold: 90, total: 200 }
];

export default function FlashDeals() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else {
          seconds = 59;
          if (minutes > 0) minutes--;
          else {
            minutes = 59;
            if (hours > 0) hours--;
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-extrabold flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            Flash Deals
          </h2>
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-red-400 font-mono font-bold">
            <Clock className="w-4 h-4" />
            <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
          </div>
        </div>
        <button onClick={() => navigate('/deals')} className="text-blue-400 hover:text-blue-300 font-semibold transition">View All Deals &rarr;</button>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {FLASH_DEALS.map(deal => (
          <motion.div 
            key={deal.id}
            whileHover={{ y: -5 }}
            className="min-w-[300px] glass-morphism rounded-3xl p-5 border border-white/10 relative group"
          >
            <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">-{deal.discount}%</div>
            <div className="h-40 flex items-center justify-center bg-white/5 rounded-2xl mb-4 overflow-hidden relative">
              <img src={deal.image} alt={deal.name} className="h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <h3 className="font-bold text-lg mb-1 truncate">{deal.name}</h3>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-[#4ade80] font-mono font-bold text-xl">Rs. {deal.price.toLocaleString()}</span>
              <span className="text-gray-500 line-through text-sm font-semibold">Rs. {deal.originalPrice.toLocaleString()}</span>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{deal.sold} Sold</span>
                <span>{deal.total - deal.sold} Left</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full" style={{ width: \`\${(deal.sold / deal.total) * 100}%\` }} />
              </div>
            </div>
            <button onClick={() => navigate(\`/products/\${deal.id}\`)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Shop Now
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
  `,
  'RecommendedForYou.jsx': `
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Eye, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RECS = [
  { id: '5', name: 'Logitech G Pro X Superlight', image: 'https://placehold.co/400x400/111/fff?text=Mouse', price: 15000, rating: 4.8, match: 98, seller: 'TechStore', reason: 'Recommended because you viewed Gaming products.' },
  { id: '6', name: 'Corsair K70 RGB MK.2', image: 'https://placehold.co/400x400/111/fff?text=Keyboard', price: 22000, rating: 4.6, match: 94, seller: 'GamerGear', reason: 'Matches your interest in PC peripherals.' },
  { id: '7', name: 'ASUS ROG Swift 360Hz', image: 'https://placehold.co/400x400/111/fff?text=Monitor', price: 85000, rating: 4.9, match: 89, seller: 'ElectroHub', reason: 'Frequently bought with gaming mice.' },
  { id: '8', name: 'SteelSeries Arctis Nova Pro', image: 'https://placehold.co/400x400/111/fff?text=Headset', price: 32000, rating: 4.7, match: 85, seller: 'AudioWorld', reason: 'Top rated in Gaming Audio.' }
];

export default function RecommendedForYou() {
  const navigate = useNavigate();

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-400" />
          Recommended For You
        </h2>
        <p className="text-gray-400 mt-2">Displaying products using AI recommendations based on your activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {RECS.map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="glass-morphism rounded-3xl p-5 border border-white/10 group relative"
          >
            <div className="absolute top-4 right-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 z-10">
              <Sparkles className="w-3 h-3" /> {item.match}% MATCH
            </div>
            
            <button className="absolute top-4 left-4 p-2 bg-white/5 border border-white/10 rounded-full hover:bg-red-500/20 hover:text-red-400 transition z-10">
              <Heart className="w-4 h-4" />
            </button>

            <div className="h-48 bg-black/20 rounded-2xl mb-4 flex items-center justify-center overflow-hidden relative">
              <img src={item.image} alt={item.name} className="object-cover group-hover:scale-105 transition duration-500" />
              
              {/* Quick View Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/20 transition">
                  <Eye className="w-4 h-4" /> Quick View
                </button>
              </div>
            </div>

            <h3 className="font-bold truncate">{item.name}</h3>
            <p className="text-xs text-gray-500 mt-1">Seller: {item.seller} • ⭐ {item.rating}</p>
            
            <div className="mt-3 p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
              <p className="text-[10px] text-gray-400 italic">"{item.reason}"</p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[#4ade80] font-mono font-bold text-lg">Rs. {item.price.toLocaleString()}</span>
              <button onClick={() => navigate(\`/products/\${item.id}\`)} className="bg-blue-600 hover:bg-blue-500 p-2.5 rounded-xl transition">
                <ShoppingBag className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
  `,
  'ShopByCategory.jsx': `
import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Shirt, Gamepad2, Book, Sparkles, Dumbbell, Sofa, Home, Utensils, Headphones, Dog, Puzzle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { name: 'Electronics', icon: Monitor, count: '12k+', color: 'from-blue-500 to-cyan-400' },
  { name: 'Fashion', icon: Shirt, count: '8k+', color: 'from-purple-500 to-pink-400' },
  { name: 'Gaming', icon: Gamepad2, count: '5k+', color: 'from-green-500 to-emerald-400' },
  { name: 'Books', icon: Book, count: '15k+', color: 'from-yellow-500 to-orange-400' },
  { name: 'Beauty', icon: Sparkles, count: '4k+', color: 'from-rose-500 to-red-400' },
  { name: 'Sports', icon: Dumbbell, count: '6k+', color: 'from-cyan-500 to-blue-500' },
  { name: 'Furniture', icon: Sofa, count: '3k+', color: 'from-amber-500 to-orange-500' },
  { name: 'Home', icon: Home, count: '9k+', color: 'from-teal-500 to-emerald-500' },
  { name: 'Kitchen', icon: Utensils, count: '7k+', color: 'from-red-500 to-rose-500' },
  { name: 'Accessories', icon: Headphones, count: '11k+', color: 'from-indigo-500 to-purple-500' },
  { name: 'Pets', icon: Dog, count: '2k+', color: 'from-orange-500 to-amber-500' },
  { name: 'Toys', icon: Puzzle, count: '4k+', color: 'from-pink-500 to-rose-500' }
];

export default function ShopByCategory() {
  const navigate = useNavigate();
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <h2 className="text-3xl font-extrabold mb-8">Shop By Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {CATEGORIES.map((cat, idx) => (
          <motion.div
            key={cat.name}
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate(\`/products?category=\${cat.name.toLowerCase()}\`)}
            className="cursor-pointer glass-morphism rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 border border-white/5 hover:border-white/20 transition-colors group"
          >
            <div className={\`w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br \${cat.color} bg-opacity-10 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-shadow\`}>
              <cat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">{cat.name}</h3>
              <p className="text-[10px] text-gray-500">{cat.count} Products</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
  `,
  'TopBrands.jsx': `
import React from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';

const BRANDS = [
  { name: 'Apple', products: '2.5k+', logo: '🍎' },
  { name: 'Samsung', products: '3.1k+', logo: '📱' },
  { name: 'Sony', products: '1.8k+', logo: '🎮' },
  { name: 'Dell', products: '1.2k+', logo: '💻' },
  { name: 'Nike', products: '5.6k+', logo: '👟' },
  { name: 'Adidas', products: '4.2k+', logo: '👕' }
];

export default function TopBrands() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <h2 className="text-3xl font-extrabold mb-8">Top Brands</h2>
      <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {BRANDS.map((brand, idx) => (
          <motion.div
            key={brand.name}
            whileHover={{ y: -5 }}
            className="min-w-[280px] glass-morphism rounded-3xl p-6 border border-white/10 flex items-center gap-6 cursor-pointer hover:bg-white/5 transition"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl border border-white/5">
              {brand.logo}
            </div>
            <div>
              <h3 className="font-bold text-xl flex items-center gap-1">
                {brand.name} <BadgeCheck className="w-4 h-4 text-blue-400" />
              </h3>
              <p className="text-xs text-gray-400 mt-1">{brand.products} Latest Arrivals</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
  `,
  'BestSellers.jsx': `
import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ShoppingCart } from 'lucide-react';

const BEST_SELLERS = [
  { id: '9', name: 'PlayStation 5 Console', price: 85000, rating: 4.9, sales: '1.2k', image: 'https://placehold.co/400x400/111/fff?text=PS5' },
  { id: '10', name: 'Nintendo Switch OLED', price: 55000, rating: 4.8, sales: '980', image: 'https://placehold.co/400x400/111/fff?text=Switch' },
  { id: '11', name: 'MacBook Air M2', price: 185000, rating: 4.9, sales: '850', image: 'https://placehold.co/400x400/111/fff?text=MacBook' },
  { id: '12', name: 'Dyson V15 Detect', price: 95000, rating: 4.7, sales: '640', image: 'https://placehold.co/400x400/111/fff?text=Dyson' }
];

export default function BestSellers() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold flex items-center gap-2">
          <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
          Today's Best Sellers
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {BEST_SELLERS.map((item, i) => (
          <motion.div key={item.id} whileHover={{ y: -5 }} className="glass-morphism rounded-3xl p-4 border border-white/10 group">
            <div className="h-40 bg-black/30 rounded-2xl mb-4 overflow-hidden relative">
              <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                <Flame className="w-3 h-3" /> HOT
              </div>
            </div>
            <h3 className="font-bold truncate">{item.name}</h3>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[#4ade80] font-mono font-bold">Rs. {item.price.toLocaleString()}</span>
              <span className="text-xs text-gray-400">🔥 {item.sales} live sales</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-xs font-bold transition">View Details</button>
              <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1">
                <ShoppingCart className="w-3 h-3" /> Buy Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
  `,
  'TrendingThisWeek.jsx': `
import React from 'react';
import { TrendingUp, Eye, ShoppingBag, Heart } from 'lucide-react';

export default function TrendingThisWeek() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-12">
      <h2 className="text-3xl font-extrabold flex items-center gap-2 mb-8">
        <TrendingUp className="w-8 h-8 text-cyan-400" /> Trending This Week
      </h2>
      <div className="glass-morphism rounded-[40px] p-8 border border-white/10 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-full md:w-1/2">
          <img src="https://placehold.co/600x400/111/fff?text=Viral+Product" className="w-full rounded-2xl shadow-2xl" />
        </div>
        <div className="w-full md:w-1/2 space-y-6">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/20">
            <TrendingUp className="w-3 h-3" /> #1 VIRAL
          </div>
          <h3 className="text-4xl font-black">VR Headset Pro X</h3>
          <p className="text-gray-400">The most discussed tech product across social media platforms this week. Experience unparalleled immersion.</p>
          
          <div className="flex gap-6 py-4 border-y border-white/10">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Views</p>
              <p className="text-xl font-mono font-bold text-white flex items-center gap-1"><Eye className="w-4 h-4 text-blue-400"/> 2.4M</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Purchases</p>
              <p className="text-xl font-mono font-bold text-white flex items-center gap-1"><ShoppingBag className="w-4 h-4 text-green-400"/> 15K</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Wishlists</p>
              <p className="text-xl font-mono font-bold text-white flex items-center gap-1"><Heart className="w-4 h-4 text-red-400"/> 89K</p>
            </div>
          </div>
          <button className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-4 rounded-xl transition shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            Explore Trend
          </button>
        </div>
      </div>
    </section>
  );
}
  `,
  'RecentlyAdded.jsx': `
import React from 'react';
export default function RecentlyAdded() { return <div/>; }
  `,
  'SpecialCollections.jsx': `
import React from 'react';
export default function SpecialCollections() { return <div/>; }
  `,
  'WhyShopBeeta.jsx': `
import React from 'react';
export default function WhyShopBeeta() { return <div/>; }
  `,
  'CustomerTestimonials.jsx': `
import React from 'react';
export default function CustomerTestimonials() { return <div/>; }
  `,
  'AiShoppingAssistant.jsx': `
import React from 'react';
export default function AiShoppingAssistant() { return <div/>; }
  `,
  'RecentlyViewed.jsx': `
import React from 'react';
export default function RecentlyViewed() { return <div/>; }
  `,
  'UpcomingDeals.jsx': `
import React from 'react';
export default function UpcomingDeals() { return <div/>; }
  `,
  'Newsletter.jsx': `
import React from 'react';
export default function Newsletter() { return <div/>; }
  `,
  'AppPromotion.jsx': `
import React from 'react';
export default function AppPromotion() { return <div/>; }
  `,
  'MarketplaceStats.jsx': `
import React from 'react';
export default function MarketplaceStats() { return <div/>; }
  `,
  'DeliveryPartners.jsx': `
import React from 'react';
export default function DeliveryPartners() { return <div/>; }
  `,
  'PaymentMethods.jsx': `
import React from 'react';
export default function PaymentMethods() { return <div/>; }
  `,
  'ProductGallery.jsx': `
import React from 'react';
export default function ProductGallery() { return <div/>; }
  `
};

for (const [file, content] of Object.entries(components)) {
  fs.writeFileSync(path.join(targetDir, file), content.trim());
}

console.log('Scaffolded Home Components');
