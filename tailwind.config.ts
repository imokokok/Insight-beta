import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(253 244 255)",
        panel: "rgba(255, 255, 255, 0.6)",
        line: "rgba(139, 92, 246, 0.1)"
      },
      borderColor: {
        DEFAULT: "rgba(139, 92, 246, 0.1)"
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(139, 92, 246, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(139, 92, 246, 0.1), 0 1px 2px -1px rgba(139, 92, 246, 0.1)",
        md: "0 4px 6px -1px rgba(139, 92, 246, 0.1), 0 2px 4px -2px rgba(139, 92, 246, 0.1)",
        lg: "0 10px 15px -3px rgba(139, 92, 246, 0.1), 0 4px 6px -4px rgba(139, 92, 246, 0.1)",
        xl: "0 20px 25px -5px rgba(139, 92, 246, 0.1), 0 8px 10px -6px rgba(139, 92, 246, 0.1)",
        panel: "0 8px 20px -4px rgba(139, 92, 246, 0.1), 0 6px 12px -6px rgba(139, 92, 246, 0.1)"
      }
    }
  },
  plugins: []
};

export default config;
