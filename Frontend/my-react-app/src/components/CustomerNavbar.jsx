import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_BASE_URL from "../config/api";

const categories = [
  "Electronics",
  "Fashion",
  "Home",
  "Sports",
  "Beauty",
  "Books",
  "Others",
];

export default function CustomerNavbar() {
  const navigate = useNavigate();
  const [showCategories, setShowCategories] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For mobile hamburger

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // ✅ Check if current user has a registered seller account
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) {
      setIsSeller(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/sellers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) setIsSeller(true);
        else setIsSeller(false);
      })
      .catch((err) => {
        console.warn("Seller check failed:", err.message);
        setIsSeller(false);
      });
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsSeller(false);
    setShowProfileMenu(false);
    navigate("/");
  };

  return (
    <div className="flex items-center justify-between px-4 md:px-10 pt-4 md:pt-10 h-16">
      {/* LEFT: Brand */}
      <Link to="/" className="text-2xl font-bold tracking-wide text-white">
        BEETA
      </Link>

        {/* CENTER: Buttons (Desktop) */}
        <div className="hidden lg:flex font-thin items-center gap-8 text-white">
          {/* ✅ ALL CATEGORIES DROPDOWN */}
          <div
            className="relative"
            onMouseEnter={() => setShowCategories(true)}
            onMouseLeave={() => setShowCategories(false)}
          >
            <button className="hover:text-blue-400 transition py-4">
              All Categories
            </button>

            {showCategories && (
              <div className="absolute left-0 top-full pt-1 z-50">
                <div className="w-56 rounded-xl overflow-hidden backdrop-blur-lg bg-gradient-to-b from-[#0b1c2d] via-[#0f2a44] to-[#071421] border border-white/10 shadow-2xl">
                  {categories.map((cat, index) => (
                    <div key={cat}>
                      <div
                        onClick={() => {
                          setShowCategories(false);
                          navigate(`/products?category=${cat.toLowerCase()}`);
                        }}
                        className="relative group flex items-center px-5 py-3 cursor-pointer text-sm text-gray-200 transition-all duration-300 hover:text-white hover:bg-gradient-to-r hover:from-[#006494]/40 hover:to-[#00a6fb]/40"
                      >
                        <span className="absolute left-0 top-0 h-full w-1 bg-[#4ac6ff] opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-r shadow-[0_0_10px_#4ac6ff]" />
                        <span className="relative z-10 group-hover:translate-x-2 transition-transform duration-300">
                          {cat}
                        </span>
                      </div>
                      {index !== categories.length - 1 && <div className="h-px bg-white/10 mx-4" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => navigate("/products")} className="hover:text-blue-400 transition">Deals</button>
          <button onClick={() => navigate("/products")} className="hover:text-blue-400 transition">New</button>
          <button onClick={() => navigate("/products")} className="hover:text-blue-400 transition">Trending</button>
          <button onClick={() => navigate("/support")} className="hover:text-blue-400 transition">Support</button>
          <button onClick={() => navigate("/about")} className="hover:text-blue-400 transition">About</button>
          <button onClick={() => navigate("/team")} className="hover:text-blue-400 transition font-medium text-blue-400">Team</button>
        </div>

        {/* RIGHT: Auth or Profile */}
        <div className="flex items-center font-thin gap-4 z-50 text-white">
          {user ? (
            <div
              className="relative flex items-center gap-3 cursor-pointer"
              onMouseEnter={() => setShowProfileMenu(true)}
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              <span className="hover:text-blue-400 transition hidden md:block">
                My Account
              </span>
              <img
                src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || "User")}&background=0D8ABC&color=fff`}
                alt="Profile"
                className="w-9 h-9 rounded-full border-2 border-white/30 object-cover bg-white"
                referrerPolicy="no-referrer"
              />

              {showProfileMenu && (
                <div className="absolute right-0 top-full pt-1 z-50">
                  <div className="w-48 rounded-xl overflow-hidden backdrop-blur-lg bg-gradient-to-b from-[#0b1c2d] via-[#0f2a44] to-[#071421] border border-white/10 shadow-2xl">
                    <div className="px-5 py-3 text-sm text-gray-200 border-b border-white/10">
                      Welcome, <br />
                      <span className="font-semibold text-white truncate block">{user.firstName || "User"}</span>
                    </div>

                    <div onClick={() => navigate("/profile")} className="px-5 py-3 cursor-pointer text-sm text-gray-200 hover:text-blue-400 hover:bg-white/5 transition">
                      My Profile
                    </div>

                    {isSeller && (
                      <div onClick={() => navigate("/seller/dashboard")} className="px-5 py-3 cursor-pointer text-sm text-green-300 font-medium flex items-center gap-2 hover:text-green-400 hover:bg-white/5 transition">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
                        My Seller Profile
                      </div>
                    )}

                    <div onClick={handleLogout} className="px-5 py-3 cursor-pointer text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition border-t border-white/10">
                      Logout
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-4">
              <button onClick={() => navigate("/login")} className="hover:text-blue-400 transition">Login</button>
              <button onClick={() => navigate("/signup")} className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-sm font-medium transition">Signup</button>
            </div>
          )}

          <button className="lg:hidden p-1" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* MOBILE MENU (Overlay) */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-[#0b1c2d] border-t border-white/10 z-50 py-4 px-6 flex flex-col gap-4">
            <button onClick={() => { navigate("/products"); setIsMenuOpen(false); }} className="text-left py-2 hover:text-blue-400">Products</button>
            <button onClick={() => { navigate("/about"); setIsMenuOpen(false); }} className="text-left py-2 hover:text-blue-400">About</button>
            <button onClick={() => { navigate("/team"); setIsMenuOpen(false); }} className="text-left py-2 text-blue-400 font-medium">Team</button>
            {!user && (
              <>
                <button onClick={() => { navigate("/login"); setIsMenuOpen(false); }} className="text-left py-2 hover:text-blue-400">Login</button>
                <button onClick={() => { navigate("/signup"); setIsMenuOpen(false); }} className="bg-blue-600 px-4 py-2 rounded-lg text-center font-medium">Signup</button>
              </>
            )}
          </div>
        )}
    </div>
  );
}
