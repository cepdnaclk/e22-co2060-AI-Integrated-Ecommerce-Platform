// src/components/deals/DealGrid.jsx
// Responsive grid of DealCards.
// Handles: loading skeletons, empty state, and animated card layout.
import { AnimatePresence, motion } from "framer-motion";
import DealCard from "./DealCard";

// ── Loading skeleton ──────────────────────────────────────────────────────
function DealSkeleton() {
  return (
    <div className="glass-morphism rounded-3xl p-5 border border-white/10 animate-pulse space-y-4 h-[460px]">
      <div className="h-4 w-16 bg-white/5 rounded" />
      <div className="h-40 bg-white/5 rounded-2xl" />
      <div className="h-4 w-3/4 bg-white/5 rounded" />
      <div className="h-3 w-1/2 bg-white/5 rounded" />
      <div className="h-3 w-full bg-white/5 rounded" />
      <div className="mt-auto flex gap-2">
        <div className="h-10 w-10 bg-white/5 rounded-xl" />
        <div className="h-10 flex-1 bg-white/5 rounded-xl" />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────
function EmptyState({ onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="col-span-full glass-morphism rounded-3xl p-16 border border-white/10 text-center space-y-4"
    >
      <div className="text-5xl">🏷️</div>
      <h4 className="font-extrabold text-xl text-white">No deals match your filters</h4>
      <p className="text-gray-400 text-sm max-w-sm mx-auto">
        Try relaxing the filters or changing the category to see more discounted products.
      </p>
      <button
        onClick={onReset}
        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition text-sm"
      >
        Clear Filters
      </button>
    </motion.div>
  );
}

/**
 * @param {Object[]} deals       - Array of deal objects from /api/deals
 * @param {boolean}  loading     - Show skeleton state
 * @param {string[]} wishlist    - Array of product._id strings in wishlist
 * @param {Function} onToast     - (message, success) => void
 * @param {Function} onWishlist  - (productId, name) => void
 * @param {Function} onReset     - Called when clicking "Clear Filters" in empty state
 */
export default function DealGrid({ deals, loading, wishlist, onToast, onWishlist, onReset }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <DealSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {deals.length === 0 ? (
          <EmptyState key="empty" onReset={onReset} />
        ) : (
          deals.map((deal) => (
            <DealCard
              key={`${deal.product._id}-${deal.offer._id}`}
              deal={deal}
              wishlist={wishlist}
              onToast={onToast}
              onWishlistToggle={onWishlist}
            />
          ))
        )}
      </AnimatePresence>
    </motion.div>
  );
}
