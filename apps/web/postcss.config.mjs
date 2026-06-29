// Tailwind v4 is CSS-first (Design System v1.1 §5): the PostCSS plugin is the entire
// build wiring — there is NO `tailwind.config.js` re-declaring theme (colors/spacing
// live only in the PULSE tokens, `@pulse/design-tokens/globals.css`, via `@theme`).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
