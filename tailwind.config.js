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
        // These resolve the CSS custom properties defined in app/globals.css's
        // :root (default values identical to the hex this replaced) — the
        // Company Setup feature overrides those variables at runtime via an
        // injected <style> tag in app/layout.js, so every bg-accent/bg-navy/
        // etc. class in the app re-colors automatically. Zero visual change
        // until a company theme is actually saved.
        //
        // rgb(var(--x) / <alpha-value>) (not plain var(--x)) is required so
        // Tailwind's "/opacity" modifier syntax (bg-navy/40, bg-accent/20 —
        // used throughout this app) still works: the vars themselves are
        // "R G B" triples (see globals.css), and Tailwind substitutes
        // <alpha-value> for any /NN suffix, or 1 when there's none.
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          dark: "rgb(var(--accent-dark) / <alpha-value>)",
          light: "rgb(var(--accent-light) / <alpha-value>)",
        },
        navy: {
          DEFAULT: "rgb(var(--navy) / <alpha-value>)",
          light: "rgb(var(--navy-light) / <alpha-value>)",
        },
        surface: "rgb(var(--bg) / <alpha-value>)",
        panel: "rgb(var(--panel-bg) / <alpha-value>)",
        line: "rgb(var(--border) / <alpha-value>)",
        amber: "#e8a33d",
        danger: "rgb(var(--error) / <alpha-value>)",
        info: "rgb(var(--blue) / <alpha-value>)",
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
