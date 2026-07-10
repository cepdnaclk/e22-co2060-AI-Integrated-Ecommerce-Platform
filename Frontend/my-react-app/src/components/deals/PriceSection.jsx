// src/components/deals/PriceSection.jsx
// Renders: final (deal) price, original price with strikethrough, and savings chip.
// All values are computed from the backend offer — no hardcoding.

/**
 * @param {number} finalPrice     - Discounted price (Rs.)
 * @param {number} originalPrice  - Original price before discount (Rs.)
 * @param {number} savings        - Amount saved (Rs.)
 * @param {string} size           - "sm" | "md" | "lg"
 */
export default function PriceSection({ finalPrice, originalPrice, savings, size = "md" }) {
  const fmtRs = (n) =>
    `Rs. ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const finalSizes = { sm: "text-base", md: "text-xl", lg: "text-3xl" };
  const origSizes  = { sm: "text-xs",  md: "text-sm", lg: "text-base" };

  const hasDiscount = originalPrice && originalPrice > finalPrice;

  return (
    <div className="flex flex-col gap-1">
      <span className={`font-black text-[#4ade80] font-mono tracking-tight ${finalSizes[size] ?? finalSizes.md}`}>
        {fmtRs(finalPrice)}
      </span>

      {hasDiscount && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-gray-500 line-through font-semibold ${origSizes[size] ?? origSizes.md}`}>
            {fmtRs(originalPrice)}
          </span>
          {savings > 0 && (
            <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 font-extrabold px-2 py-0.5 rounded">
              Save {fmtRs(savings)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
