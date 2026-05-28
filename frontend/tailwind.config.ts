const config = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./sections/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-void": "#04050a",
        surface: "#060810",
        "surface-2": "#0a0d16",
        glass: "rgba(255,255,255,0.025)",
        border: "rgba(255,255,255,0.07)",
        "warm-white": "#ffffff",
        gold: {
          300: "#00c4b8",
          400: "#00d97e",
        },
        emerald: {
          400: "#00d97e",
        },
        teal: {
          300: "#00c4b8",
        },
        indigo: {
          400: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(3rem, 8vw, 6.5rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-lg": ["clamp(3rem, 8vw, 6.5rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "display-md": ["clamp(2rem, 5vw, 3.5rem)", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
      },
      letterSpacing: {
        display: "-0.04em",
      },
      opacity: {
        8: "0.08",
        12: "0.12",
        14: "0.14",
        15: "0.15",
        35: "0.35",
        55: "0.55",
        85: "0.85",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -18px, 0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55", boxShadow: "0 0 0 0 rgba(0, 217, 126, 0.45)" },
          "50%": { opacity: "1", boxShadow: "0 0 24px 4px rgba(0, 217, 126, 0.45)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-220% center" },
          "100%": { backgroundPosition: "220% center" },
        },
        wave: {
          "0%, 100%": { transform: "scaleX(1) scaleY(1)" },
          "35%": { transform: "scaleX(1.04) scaleY(0.98)" },
          "70%": { transform: "scaleX(0.98) scaleY(1.04)" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.8s ease-in-out infinite",
        shimmer: "shimmer 2.6s linear infinite",
        wave: "wave 7s ease-in-out infinite",
      },
    },
  },
};

export default config;
