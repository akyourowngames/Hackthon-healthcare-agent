const config = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./sections/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        primary: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        border: "var(--bg-border)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
        accent: "var(--text-accent)",
      },
      borderColor: {
        DEFAULT: "var(--bg-border)",
        border: "var(--bg-border)",
      },
      colors: {
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          glow: "var(--accent-glow)",
        },
        status: {
          critical: "var(--status-critical)",
          warning: "var(--status-warning)",
          normal: "var(--status-normal)",
          improving: "var(--status-improving)",
        },
        /* Legacy aliases — map to design tokens */
        "bg-void": "var(--bg-primary)",
        surface: "var(--bg-surface)",
        "surface-2": "var(--bg-elevated)",
        "warm-white": "var(--text-primary)",
        emerald: {
          400: "var(--accent-primary)",
          500: "var(--accent-primary)",
        },
        gold: {
          300: "var(--status-improving)",
          400: "var(--accent-primary)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-sora)", "Sora", "ui-sans-serif", "system-ui", "sans-serif"],
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
      borderRadius: {
        card: "0.75rem",
        btn: "0.5rem",
        input: "0.5rem",
      },
      boxShadow: {
        "accent-glow": "0 0 0 3px var(--accent-glow)",
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
          "0%, 100%": { opacity: "0.55", boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.45)" },
          "50%": { opacity: "1", boxShadow: "0 0 24px 4px rgba(16, 185, 129, 0.45)" },
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
