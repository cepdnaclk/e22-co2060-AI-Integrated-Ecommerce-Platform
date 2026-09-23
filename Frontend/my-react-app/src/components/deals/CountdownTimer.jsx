// src/components/deals/CountdownTimer.jsx
// Reusable countdown timer. Accepts a target ISO date string OR total seconds.
// Used by DealBanner and the Hero section of Deals.jsx.
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

function pad(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function getSecondsLeft(targetDate) {
  const diff = Math.floor((new Date(targetDate) - Date.now()) / 1000);
  return Math.max(0, diff);
}

/**
 * @param {string}  targetDate  - ISO date string for the deadline (e.g. end of day)
 * @param {number}  initialSeconds - Alternatively supply raw seconds (ignores targetDate)
 * @param {boolean} loop        - If true, resets to initialSeconds when it hits 0
 * @param {string}  label       - Text above the timer
 * @param {string}  className   - Extra class names for the wrapper
 */
export default function CountdownTimer({
  targetDate,
  initialSeconds,
  loop = false,
  label = "Offer Expires In",
  className = "",
}) {
  const [secs, setSecs] = useState(() => {
    if (targetDate) return getSecondsLeft(targetDate);
    return initialSeconds ?? 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 0) {
          if (loop) return initialSeconds ?? 0;
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loop, initialSeconds]);

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  const Cell = ({ value, unit }) => (
    <div className="flex flex-col items-center glass-morphism rounded-xl px-4 py-3 border border-white/5 min-w-[60px]">
      <span className="text-2xl font-extrabold text-blue-400 font-mono leading-none">{pad(value)}</span>
      <span className="text-[9px] text-gray-400 uppercase font-bold mt-1 tracking-wider">{unit}</span>
    </div>
  );

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && (
        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-400" />
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <Cell value={h} unit="HRS" />
        <span className="text-blue-500/50 font-black text-xl mb-4">:</span>
        <Cell value={m} unit="MIN" />
        <span className="text-blue-500/50 font-black text-xl mb-4">:</span>
        <Cell value={s} unit="SEC" />
      </div>
    </div>
  );
}
