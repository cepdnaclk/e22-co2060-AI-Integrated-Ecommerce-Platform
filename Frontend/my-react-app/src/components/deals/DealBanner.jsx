// src/components/deals/DealBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Hero banner for the featured "Deal of the Day".
// Receives a REAL deal object from /api/deals.
// All CTAs use:
//   → "Shop Now" / "Buy Now"  → navigate("/products/:product._id")
//   → "Add to Cart"           → CartContext.addItem(offer._id, 1)
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Heart, Percent, Tag, CheckCircle } from "lucide-react";
import { useCart } from "../../context/CartContext";
import PriceSection from "./PriceSection";
import DiscountBadge from "./DiscountBadge";
import CountdownTimer from "./CountdownTimer";

// Build end-of-day target for today's deal countdown
function getEndOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

/**
 * @param {Object} deal - { product, offer } from /api/deals
 */
export default function DealBanner({ deal }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const token = localStorage.getItem("token");
  const [adding, setAdding] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  if (!deal) return null;
  const { product, offer } = deal;

  const goToProduct = () => navigate(`/products/${product._id}`);

  const handleAddToCart = async () => {
    if (!token) { navigate("/login"); return; }
    setAdding(true);
    try {
      await addItem(offer._id, 1);
    } catch {
      // silent — product page handles error display
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!token) { navigate("/login"); return; }
    setAdding(true);
    try {
      await addItem(offer._id, 1);
      navigate("/cart");
    } catch {
      goToProduct();
    } finally {
      setAdding(false);
    }
  };

  const stockPct = Math.min(100, Math.max(4, (offer.stock / 30) * 100));

  return (
    <div className="relative rounded-[32px] overflow-hidden border border-white/10 glass-morphism p-6 md:p-10 shadow-2xl flex flex-col lg:flex-row items-center gap-10 group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Product image */}
      <div className="w-full lg:w-[45%] flex items-center justify-center relative z-10">
        <div className="relative w-full max-w-[420px] aspect-square bg-slate-900/40 border border-white/5 rounded-2xl p-6 flex items-center justify-center shadow-inner overflow-hidden">
          <motion.img
            src={offer.image || product.image}
            alt={product.productName}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="max-h-[300px] object-contain rounded-xl"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";
            }}
          />
          {/* Discount overlay badge */}
          <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg">
            <Percent className="w-4 h-4" />
            SAVE {offer.discountPercentage}%
          </div>
        </div>
      </div>

      {/* Product info */}
      <div className="w-full lg:w-[55%] space-y-5 relative z-10 text-left">
        {/* Category + Rating chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-bold uppercase tracking-wider">
            {product.category}
          </span>
          {product.brand && (
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-xs font-bold">
              {product.brand}
            </span>
          )}
          <DiscountBadge pct={offer.discountPercentage} size="md" variant="orange" />
        </div>

        {/* Title */}
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-2">
            <Tag className="w-3 h-3" />
            Featured Deal of the Day
          </div>
          <h3
            className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight cursor-pointer hover:text-blue-300 transition-colors"
            onClick={goToProduct}
          >
            {product.productName}
          </h3>
          {product.description && (
            <p className="text-gray-400 text-sm mt-2 leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Price */}
        <PriceSection
          finalPrice={offer.finalPrice}
          originalPrice={offer.originalPrice}
          savings={offer.savings}
          size="lg"
        />

        {/* Seller */}
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <CheckCircle className="w-4 h-4 text-blue-400" />
          <span>Sold by <strong className="text-white">{offer.sellerName}</strong></span>
          {offer.warranty && offer.warranty !== "No warranty" && (
            <span className="text-xs text-gray-500 ml-2">· {offer.warranty}</span>
          )}
        </div>

        {/* Stock progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-gray-400">
            <span>Only {offer.stock} left in stock</span>
            <span className="text-blue-400">{Math.round(stockPct)}% remaining</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stockPct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
            />
          </div>
        </div>

        {/* Countdown */}
        <CountdownTimer
          targetDate={getEndOfDay()}
          label="Deal Expires In"
          className="items-start"
        />

        {/* CTAs */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleBuyNow}
            disabled={adding || offer.stock === 0}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold rounded-2xl transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-5 h-5" />
            {adding ? "Adding…" : offer.stock === 0 ? "Out of Stock" : "Buy Now"}
          </button>

          <button
            onClick={handleAddToCart}
            disabled={adding || offer.stock === 0}
            className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all font-bold text-sm active:scale-95 disabled:opacity-50"
          >
            Add to Cart
          </button>

          <button
            onClick={() => setInWishlist((p) => !p)}
            className={`px-4 py-4 rounded-2xl border transition-all ${
              inWishlist
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
            title={inWishlist ? "Remove from Wishlist" : "Save to Wishlist"}
          >
            <Heart className={`w-5 h-5 ${inWishlist ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* "View full product" link */}
        <button
          onClick={goToProduct}
          className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition"
        >
          View full product details & all seller offers →
        </button>
      </div>
    </div>
  );
}
