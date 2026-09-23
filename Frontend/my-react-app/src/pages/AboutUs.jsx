import React from "react";
import CustomerNavbar from "../components/CustomerNavbar";
import CustomerFooter from "../components/CustomerFooter";
import Reveal from "../components/Reveal";
import { Link } from "react-router-dom";

export default function AboutUs() {
  const missionCards = [
    { title: "Secure & Transparent", icon: "🔒", desc: "A secure and transparent marketplace for all users." },
    { title: "Reliable Delivery", icon: "🚚", desc: "Reliable delivery and tracking systems you can count on." },
    { title: "Authentic Products", icon: "💎", desc: "Authentic products with verified and trusted sellers." },
    { title: "User Friendly", icon: "📱", desc: "A user-friendly platform for both buyers and sellers." },
  ];

  const whatWeOffer = [
    { title: "Wide product range", icon: "🛍️", desc: "Across multiple categories." },
    { title: "Smart delivery tracking system", icon: "📍", desc: "Real-time updates." },
    { title: "Verified product handling", icon: "✅", desc: "Packaging processes." },
    { title: "Secure payment options", icon: "💳", desc: "Including Cash On Delivery." },
    { title: "Real-time order tracking", icon: "🔔", desc: "And instant updates." },
  ];

  const whyChooseUs = [
    "Verified sellers and product authenticity",
    "Transparent delivery workflow",
    "User-focused design for easy navigation",
    "Strong backend system for managing orders and logistics",
    "Continuous improvements based on user feedback",
  ];

  const values = [
    { label: "High-quality service", icon: "⭐" },
    { label: "Customer satisfaction", icon: "🤝" },
    { label: "Long-term trust", icon: "🛡️" },
    { label: "Continuous improvement", icon: "📈" },
  ];

  return (
    <div className="min-h-screen smooth-bg text-white font-sans overflow-x-hidden">
      <CustomerNavbar />

      {/* BREADCRUMBS */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-20">
        <nav className="flex items-center gap-3 text-sm text-gray-400">
          <Link to="/" className="hover:text-blue-400">Home</Link>
          <span>/</span>
          <span className="text-gray-200">About Us</span>
        </nav>
      </div>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-2 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <div className="space-y-7">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              About Us.
            </h1>
            <p className="text-xl pb-4 md:text-lg text-[#4ac6ff] font-regular pt-4">
              Welcome to BEETA – your trusted destination for seamless, secure, and reliable online shopping.
            </p>
            <p className="text-lg md:text-lg font-thin text-gray-300 mb-6 leading-relaxed">
              We are an innovative e-commerce platform designed to connect buyers and sellers in a smarter, more transparent way.
              Our goal is to simplify online shopping while ensuring authenticity, trust, and efficiency at every step of the journey.
            </p>
            <div className="pt-8">
              <Link to="/products" className="inline-block px-6 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#006494] via-[#0582ca] to-[#00a6fb] transition-all duration-500 transform-gpu hover:scale-105">
                Explore Shop
              </Link>
            </div>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="relative group">
            <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
            <img
              src="ecommerce_hero_about_1777703757843.png"
              alt="Shopping Hero"
              className="relative w-full h-auto rounded-3xl shadow-2xl border border-white/10"
            />
          </div>
        </Reveal>
      </section>

      {/* MISSION SECTION */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center space-y-4 mb-16">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold">Our Mission</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our mission is to revolutionize the e-commerce experience by providing:
            </p>
          </Reveal>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {missionCards.map((card, idx) => (
            <Reveal key={card.title} delay={idx * 100}>
              <div className="h-full backdrop-blur-lg bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 hover:border-blue-500/50 transition-all group">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHAT WE OFFER & WHY CHOOSE US */}
      <section className="py-24 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-20">
          {/* OFFER */}
          <div className="space-y-12">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-bold">What We Offer</h2>
            </Reveal>
            <div className="space-y-8">
              {whatWeOffer.map((item, idx) => (
                <Reveal key={item.title} delay={idx * 100}>
                  <div className="flex gap-6 items-start">
                    <div className="w-12 h-12 flex-shrink-0 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={400}>
              <div className="relative mt-8 p-6 backdrop-blur-xl bg-blue-500/5 border border-blue-500/20 rounded-3xl overflow-hidden">
                <p className="text-sm font-bold text-blue-400 mb-4 uppercase tracking-widest">Real-Time Experience</p>
                <img src="tracking_mobile_mockup_1777703788783.png" alt="Mobile Tracking" className="w-full max-w-[300px] mx-auto rounded-2xl shadow-xl" />
              </div>
            </Reveal>
          </div>

          {/* WHY US */}
          <div className="space-y-12">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-bold">Why Choose Us</h2>
            </Reveal>
            <div className="space-y-6">
              {whyChooseUs.map((benefit, idx) => (
                <Reveal key={benefit} delay={idx * 100}>
                  <div className="flex items-center gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <svg className="w-3 h-3 text-blue-400 group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-300 font-medium">{benefit}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={300}>
              <div className="p-10 bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 rounded-[40px] mt-12">
                <blockquote className="text-2xl font-medium leading-relaxed italic text-gray-200">
                  "Shopping at BEETA has been a game changer. The transparency in delivery and verified sellers gives me the peace of mind I need."
                </blockquote>
                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500" />
                  <div>
                    <p className="font-bold text-white">Sarah Jenkins</p>
                    <p className="text-sm text-gray-400">Verified Customer</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* VISION SECTION */}
      <section className="py-24 max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Our Vision</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              We envision becoming a leading e-commerce ecosystem that not only facilitates buying and selling but also ensures trust, security, and accountability throughout the entire process.
            </p>
            <p className="text-gray-400 leading-relaxed">
              As we grow, we remain committed to building a community where quality meets efficiency, creating lasting value for every stakeholder in our network.
            </p>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <img src="vision_abstract_growth_1777703956946.png" alt="Our Vision" className="w-full h-auto" />
          </div>
        </Reveal>
      </section>

      {/* COMMITMENT SECTION */}
      <section className="py-24 text-center">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Commitment</h2>
          <p className="text-gray-400 mb-16">We are committed to:</p>
        </Reveal>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {values.map((v, idx) => (
            <Reveal key={v.label} delay={idx * 100}>
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-4xl hover:border-blue-500 transition-colors">
                  {v.icon}
                </div>
                <p className="font-bold text-gray-300 text-sm md:text-base">{v.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-24 max-w-7xl mx-auto px-4 md:px-8">
        <Reveal>
          <div className="backdrop-blur-xl bg-white/[0.02] border border-white/10 p-12 md:p-20 rounded-[40px] text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">Get in Touch</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-16">
              Have questions or need support? Our team is always ready to help.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="text-blue-400 text-3xl">📧</div>
                <h4 className="font-bold">Email</h4>
                <p className="text-gray-400">support@beeta.com</p>
              </div>
              <div className="space-y-4">
                <div className="text-blue-400 text-3xl">📞</div>
                <h4 className="font-bold">Phone</h4>
                <p className="text-gray-400">+94 77 123 4567</p>
              </div>
              <div className="space-y-4">
                <div className="text-blue-400 text-3xl">🌐</div>
                <h4 className="font-bold">Website</h4>
                <p className="text-gray-400">www.beeta.com</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <CustomerFooter />
    </div>
  );
}
