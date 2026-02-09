import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(253 244 255)",
        panel: "rgba(255, 255, 255, 0.6)",
        line: "rgba(139, 92, 246, 0.1)",
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
      },
      borderColor: {
        DEFAULT: "rgba(139, 92, 246, 0.1)",
        border: "rgba(139, 92, 246, 0.1)",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(139, 92, 246, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(139, 92, 246, 0.1), 0 1px 2px -1px rgba(139, 92, 246, 0.1)",
        md: "0 4px 6px -1px rgba(139, 92, 246, 0.1), 0 2px 4px -2px rgba(139, 92, 246, 0.1)",
        lg: "0 10px 15px -3px rgba(139, 92, 246, 0.1), 0 4px 6px -4px rgba(139, 92, 246, 0.1)",
        xl: "0 20px 25px -5px rgba(139, 92, 246, 0.1), 0 8px 10px -6px rgba(139, 92, 246, 0.1)",
        panel: "0 8px 20px -4px rgba(139, 92, 246, 0.1), 0 6px 12px -6px rgba(139, 92, 246, 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "mesh-gradient": "radial-gradient(at 40% 20%, hsla(28,100%,74%,0) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(340,100%,76%,0) 0px, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient": "gradient 8s ease infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s infinite linear",
        "price-flash-up": "priceFlashUp 0.5s ease-out",
        "price-flash-down": "priceFlashDown 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        priceFlashUp: {
          "0%": { backgroundColor: "rgba(16, 185, 129, 0.4)" },
          "100%": { backgroundColor: "rgba(16, 185, 129, 0)" },
        },
        priceFlashDown: {
          "0%": { backgroundColor: "rgba(239, 68, 68, 0.4)" },
          "100%": { backgroundColor: "rgba(239, 68, 68, 0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
