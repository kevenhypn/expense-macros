/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0d1410",
        card: "#151d18",
        cardAlt: "#101713",
        border: "#2b382f",
        borderAlt: "#1d2921",
        primary: "#ffffff",
        accent: "#9be15d",
        danger: "#f97316",
        success: "#34d399",
      },
    },
  },
  plugins: [],
};
