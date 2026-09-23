// src/components/deals/DiscountBadge.jsx
// Displays the discount %, savings amount, or both.
// Purely presentational — no logic.

/**
 * @param {number}  pct       - Discount percentage (e.g. 30)
 * @param {string}  size      - "sm" | "md" | "lg"
 * @param {string}  variant   - "red" | "orange" | "cyan" | "yellow"
 */
export default function DiscountBadge({ pct, size = "md", variant = "red" }) {
  if (!pct || pct <= 0) return null;

  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const variants = {
    red:    "bg-red-500/10 border-red-500/25 text-red-400",
    orange: "bg-orange-500/10 border-orange-500/25 text-orange-400",
    cyan:   "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
    yellow: "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
  };

  return (
    <span
      className={`
        inline-flex items-center font-black rounded-lg border
        ${sizes[size] ?? sizes.md}
        ${variants[variant] ?? variants.red}
      `}
    >
      -{pct}%
    </span>
  );
}
