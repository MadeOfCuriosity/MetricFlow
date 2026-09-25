// All colors come from src/styles/theme.css; this file only maps Tailwind names to those variables.
const v = (name) => `rgb(var(--color-${name}) / <alpha-value>)`
const scale = (name, steps) => Object.fromEntries(steps.map((s) => [s, v(`${name}-${s}`)]))
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      extend: {
      colors: {
        // Surfaces & muted text (theme-aware)
        dark: scale('dark', [50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950]),
        // Headings & strong text (white in dark, near-black in light)
        foreground: v('foreground'),
        // Monochrome, for buttons
        primary: scale('primary', SHADES),
        // Brand accent #cf603e: highlights, charts, active/selected states
        brand: v('brand'),
        // Status (the only greens/ambers/reds in the app)
        success: scale('success', [200, 300, 400, 500, 600, 700]),
        warning: scale('warning', [300, 400, 500, 600]),
        danger: scale('danger', [300, 400, 500, 600]),
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.25s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
