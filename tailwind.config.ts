import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#ebefff",
          200: "#d6deff",
          300: "#b3c3ff",
          400: "#839cff",
          500: "#5f79ff",
          600: "#4259f4",
          700: "#3446db",
          800: "#2d3bb1",
          900: "#29368b"
        }
      },
      boxShadow: {
        soft: "0 20px 60px -24px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
