/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      /* 🌫 Glassmorphism blur */
      backdropBlur: {
        xs: "2px",
      },

      /* 🎨 Dark blue theme colors */
      colors: {
        primary: "#3A86FF",
        surface: "#1C2541",
        navy: "#0B132B",
      },

      /* ✨ Glow shadows */
      boxShadow: {
        glow: "0 0 25px rgba(58,134,255,0.45)",
        glowSoft: "0 0 40px rgba(76,201,240,0.35)",
      },

      /* 🌊 Smooth animations */
      animation: {
        glow: "glow 6s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },

      keyframes: {
        glow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
