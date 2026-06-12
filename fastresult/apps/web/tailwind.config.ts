import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fff7",
          100: "#dcffe9",
          400: "#3df07e",
          500: "#13cf5f",
          600: "#08a94b",
          950: "#052e18"
        },
        ink: "#08110d"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(19, 207, 95, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
