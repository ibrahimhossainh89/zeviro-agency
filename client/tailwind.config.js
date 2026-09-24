/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Theme-aware colors: values come from CSS variables in index.css (dark = default, .light overrides)
      colors: {
        white: 'rgb(var(--white) / <alpha-value>)',
        snow: '#ffffff', // always white (text on brand/colored backgrounds)
        ink: { 950: 'rgb(var(--ink-950) / <alpha-value>)', 900: 'rgb(var(--ink-900) / <alpha-value>)', 850: 'rgb(var(--ink-850) / <alpha-value>)', 800: 'rgb(var(--ink-800) / <alpha-value>)', 700: 'rgb(var(--ink-700) / <alpha-value>)', 600: 'rgb(var(--ink-600) / <alpha-value>)', 500: 'rgb(var(--ink-500) / <alpha-value>)' },
        slate: { 50: 'rgb(var(--slate-50) / <alpha-value>)', 100: 'rgb(var(--slate-100) / <alpha-value>)', 200: 'rgb(var(--slate-200) / <alpha-value>)', 300: 'rgb(var(--slate-300) / <alpha-value>)', 400: 'rgb(var(--slate-400) / <alpha-value>)', 500: 'rgb(var(--slate-500) / <alpha-value>)', 600: 'rgb(var(--slate-600) / <alpha-value>)', 700: 'rgb(var(--slate-700) / <alpha-value>)', 800: 'rgb(var(--slate-800) / <alpha-value>)', 900: 'rgb(var(--slate-900) / <alpha-value>)', 950: 'rgb(var(--slate-950) / <alpha-value>)' },
        brand: { 100: 'rgb(var(--brand-100) / <alpha-value>)', 200: 'rgb(var(--brand-200) / <alpha-value>)', 300: 'rgb(var(--brand-300) / <alpha-value>)', 400: 'rgb(var(--brand-400) / <alpha-value>)', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
        emerald: { 100: 'rgb(var(--emerald-100) / <alpha-value>)', 200: 'rgb(var(--emerald-200) / <alpha-value>)', 300: 'rgb(var(--emerald-300) / <alpha-value>)', 400: 'rgb(var(--emerald-400) / <alpha-value>)' },
        amber: { 100: 'rgb(var(--amber-100) / <alpha-value>)', 200: 'rgb(var(--amber-200) / <alpha-value>)', 300: 'rgb(var(--amber-300) / <alpha-value>)', 400: 'rgb(var(--amber-400) / <alpha-value>)' },
        rose: { 100: 'rgb(var(--rose-100) / <alpha-value>)', 200: 'rgb(var(--rose-200) / <alpha-value>)', 300: 'rgb(var(--rose-300) / <alpha-value>)', 400: 'rgb(var(--rose-400) / <alpha-value>)' },
        sky: { 100: 'rgb(var(--sky-100) / <alpha-value>)', 200: 'rgb(var(--sky-200) / <alpha-value>)', 300: 'rgb(var(--sky-300) / <alpha-value>)', 400: 'rgb(var(--sky-400) / <alpha-value>)' },
        cyan: { 100: 'rgb(var(--cyan-100) / <alpha-value>)', 200: 'rgb(var(--cyan-200) / <alpha-value>)', 300: 'rgb(var(--cyan-300) / <alpha-value>)', 400: 'rgb(var(--cyan-400) / <alpha-value>)' },
        fuchsia: { 100: 'rgb(var(--fuchsia-100) / <alpha-value>)', 200: 'rgb(var(--fuchsia-200) / <alpha-value>)', 300: 'rgb(var(--fuchsia-300) / <alpha-value>)', 400: 'rgb(var(--fuchsia-400) / <alpha-value>)' },
        accent: { 400: '#22d3ee', 500: '#06b6d4' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 45%,#d946ef 100%)',
        'grid': 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,.25), 0 10px 40px -10px rgba(139,92,246,.45)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        fadeUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { float: 'float 6s ease-in-out infinite', fadeUp: 'fadeUp .5s ease both' },
    },
  },
  plugins: [],
};
