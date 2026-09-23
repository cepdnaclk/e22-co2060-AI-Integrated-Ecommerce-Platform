import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminMobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", icon: "📊", path: "/admin/dashboard" },
    { label: "Products", icon: "📦", path: "/admin/products" },
    { label: "Orders", icon: "📋", path: "/admin/orders" },
  ];

  // Hidden on desktop (lg+), fixed to bottom on mobile
  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[1000] animate-fadeIn">
      <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex justify-around items-center shadow-2xl shadow-black/50 ring-1 ring-white/5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 relative
                ${isActive ? "text-purple-400 bg-purple-500/10" : "text-slate-500 hover:text-slate-300"}
              `}
            >
              <span className={`text-xl transition-transform ${isActive ? "scale-110 -translate-y-0.5" : ""}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? "opacity-100" : "opacity-60"}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_8px_#a855f7]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
