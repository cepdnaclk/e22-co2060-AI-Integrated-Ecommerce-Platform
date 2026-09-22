import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, Phone, MapPin, ArrowRight, CheckCircle,
  ShieldCheck, Truck, RefreshCw, Star
} from "lucide-react";

/* ── Social media SVG icons ─────────────────────────────────────────────── */
const SocialIcon = ({ name }) => {
  const icons = {
    facebook: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M4 4l16 16M4 20 20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M4 4h4l12 16h-4z"/>
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
        <circle cx="4" cy="4" r="2"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

/* ── Link columns ────────────────────────────────────────────────────────── */
const COLUMNS = [
  {
    title: "Company",
    links: [
      { label: "About BEETA", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Press & Media", to: "/press" },
      { label: "Blog", to: "/blog" },
      { label: "Investors", to: "/investors" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Track Order", to: "/orders" },
      { label: "Returns & Refunds", to: "/returns" },
      { label: "Shipping Info", to: "/shipping" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "Seller Center",
    links: [
      { label: "Sell on BEETA", to: "/seller/register" },
      { label: "Seller Dashboard", to: "/seller/dashboard" },
      { label: "Seller Policies", to: "/seller/policies" },
      { label: "Seller Support", to: "/seller/support" },
      { label: "Seller Blog", to: "/seller/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Cookie Policy", to: "/cookies" },
      { label: "Accessibility", to: "/accessibility" },
      { label: "Sitemap", to: "/sitemap" },
    ],
  },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Secure Payments", color: "text-green-400" },
  { icon: Truck,       label: "Fast Delivery",   color: "text-blue-400"  },
  { icon: RefreshCw,   label: "Easy Returns",    color: "text-purple-400"},
  { icon: Star,        label: "Verified Sellers", color: "text-yellow-400"},
];

export default function CustomerFooter() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <footer className="relative border-t border-white/5 mt-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-48 bg-blue-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-64 h-48 bg-cyan-500/5 blur-[60px] pointer-events-none" />

      {/* ── Trust badges strip ── */}
      <div className="border-b border-white/5 py-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_BADGES.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <b.icon className={`w-6 h-6 flex-shrink-0 ${b.color}`} />
                <span className="text-sm font-semibold text-gray-300">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main footer grid ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-12 mb-14">

          {/* Brand + contact (spans 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="text-3xl font-extrabold tracking-wide text-white block">
              BEETA
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              AI-powered marketplace connecting thousands of buyers and verified sellers.
              Smart products. Better decisions. Premium shopping.
            </p>

            {/* Contact */}
            <div className="space-y-3">
              <a href="mailto:support@beeta.lk" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition text-sm">
                <Mail className="w-4 h-4 flex-shrink-0" /> support@beeta.lk
              </a>
              <a href="tel:+94112345678" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition text-sm">
                <Phone className="w-4 h-4 flex-shrink-0" /> +94 11 234 5678
              </a>
              <div className="flex items-start gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" /> 42 Innovation Drive, Colombo 03, Sri Lanka
              </div>
            </div>

            {/* Social icons */}
            <div className="flex gap-3">
              {["facebook", "twitter", "instagram", "youtube", "linkedin"].map((soc) => (
                <a
                  key={soc}
                  href="#"
                  aria-label={soc}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all duration-200"
                >
                  <SocialIcon name={soc} />
                </a>
              ))}
            </div>

            {/* App download */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Download App</p>
              <div className="flex gap-3">
                <a href="#" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl transition group">
                  <span className="text-lg">🍎</span>
                  <div>
                    <p className="text-[9px] text-gray-500 leading-none">Download on the</p>
                    <p className="text-xs font-bold text-white leading-none">App Store</p>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl transition group">
                  <span className="text-lg">▶️</span>
                  <div>
                    <p className="text-[9px] text-gray-500 leading-none">Get it on</p>
                    <p className="text-xs font-bold text-white leading-none">Google Play</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Link columns — 1 col each on lg */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-gray-400 text-sm hover:text-blue-400 transition-colors flex items-center gap-1 group"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter col */}
          <div className="lg:col-span-1">
            <h4 className="text-white font-bold mb-5 text-sm uppercase tracking-widest">Newsletter</h4>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              Get daily deals & new arrivals straight to your inbox.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition"
                />
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/20"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Payment methods row ── */}
        <div className="py-6 border-t border-b border-white/5 flex flex-wrap items-center gap-4 mb-8">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest mr-2">Secure Payments:</span>
          {[
            { name: "Visa",       src: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",              h: "h-4"  },
            { name: "Mastercard", src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",            h: "h-6"  },
            { name: "PayPal",     src: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",                     h: "h-4"  },
            { name: "Stripe",     src: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg", h: "h-4" },
          ].map((pm) => (
            <div key={pm.name} className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center opacity-70 hover:opacity-100 transition">
              <img src={pm.src} alt={pm.name} className={`${pm.h} w-auto`} />
            </div>
          ))}
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-1 opacity-70 hover:opacity-100 transition">
            <ShieldCheck className="w-3 h-3 text-green-400" />
            <span className="text-xs font-bold text-white">SSL Secure</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white opacity-70 hover:opacity-100 transition">
            Cash on Delivery
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} BEETA Technologies (Pvt) Ltd. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((item) => (
              <Link
                key={item}
                to={`/${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-gray-600 hover:text-gray-400 text-xs transition"
              >
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-xs">Made with</span>
            <span className="text-red-500">❤</span>
            <span className="text-gray-600 text-xs">in Sri Lanka 🇱🇰</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
