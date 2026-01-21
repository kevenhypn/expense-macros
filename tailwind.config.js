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
        background: "#121212",
        card: "#1e1e1e",
        cardAlt: "#1a1a1a",
        border: "#333333",
        borderAlt: "#2a2a2a",
        primary: "#ffffff",
        accent: "#3b82f6",
        danger: "#ef4444",
        success: "#22c55e",
      },
    },
  },
  plugins: [],
};
