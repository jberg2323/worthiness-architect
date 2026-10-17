/** @type {import('tailwindcss').Config} */
// Colors map to the semantic CSS variables in src/index.css (light + dark). See BRAND.md.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        sunken: 'var(--sunken)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        brand: 'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
        'on-brand': 'var(--on-brand)',
        'on-brand-2': 'var(--on-brand-2)',
        'brand-soft': 'var(--brand-soft)',
        'brand-ink': 'var(--brand-ink)',
        keystone: 'var(--keystone)',
        'keystone-soft': 'var(--keystone-soft)',
        'keystone-ink': 'var(--keystone-ink)',
        rule: 'var(--rule)',
        'rule-soft': 'var(--rule-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        'cat-1': 'var(--cat-1)',
        'cat-2': 'var(--cat-2)',
        'cat-3': 'var(--cat-3)',
        'cat-4': 'var(--cat-4)'
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '20px'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)'
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        breathe: {
          '0%': { transform: 'scale(0.62)' },
          '40%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.62)' }
        }
      },
      animation: {
        rise: 'rise 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        breathe: 'breathe 10s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
