/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#0f9b8e",
          dark: "#0c7a70",
          light: "#e6f6f4",
        },
        navy: {
          DEFAULT: "#1b2a4a",
          light: "#26365c",
        },
        surface: "#f7f8fa",
        panel: "#ffffff",
        line: "#e2e5ea",
        amber: "#e8a33d",
        danger: "#d64545",
        info: "#3b6ea5",
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Playfair Display'", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(27,42,74,.06), 0 4px 16px rgba(27,42,74,.05)",
        pop: "0 12px 32px rgba(27,42,74,.18)",
      },
    },
  },
  plugins: [],
};
