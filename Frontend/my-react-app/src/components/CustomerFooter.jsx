import React from "react";
import { Link } from "react-router-dom";

export default function CustomerFooter() {
  return (
    <footer className="bg-black/80 border-t border-white/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* BRAND */}
          <div className="space-y-6">
            <Link to="/" className="text-2xl font-bold tracking-wide text-white">
              BEETA
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Your trusted online marketplace for quality products, secure shopping, and reliable delivery. 
              Connecting thousands of buyers and sellers daily under the BEETA ecosystem.
            </p>
            <div className="flex gap-4">
              {['facebook', 'twitter', 'instagram', 'linkedin'].map(soc => (
                <a key={soc} href="#" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all">
                  <span className="capitalize text-[10px] font-bold">{soc[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4">
              {['Home', 'Shop', 'Categories', 'Deals', 'Track Order', 'About Us', 'Contact Us'].map(link => (
                <li key={link}>
                  <Link to={`/${link.toLowerCase().replace(' ', '-')}`} className="text-gray-400 text-sm hover:text-blue-400 transition">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CUSTOMER SERVICE */}
          <div>
            <h4 className="text-white font-bold mb-6">Customer Service</h4>
            <ul className="space-y-4">
              {['Help Center', 'Shipping & Delivery', 'Returns & Refunds', 'Terms & Conditions', 'Privacy Policy', 'FAQs'].map(link => (
                <li key={link}>
                  <a href="#" className="text-gray-400 text-sm hover:text-blue-400 transition">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* NEWSLETTER */}
          <div>
            <h4 className="text-white font-bold mb-6">Newsletter</h4>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Subscribe to get updates on new arrivals, exclusive deals and more.
            </p>
            <div className="space-y-3">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-400 transition"
              />
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(37,99,235,0.3)]">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-xs">© 2026 BEETA. All rights reserved.</p>
          <div className="flex gap-4 opacity-70">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
            <div className="bg-white px-2 rounded text-[10px] font-bold text-black flex items-center h-6">COD</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
