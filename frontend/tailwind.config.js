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
        // Theme-aware surface colors (via CSS variables)
        dark: {
          50: 'rgb(var(--color-dark-50) / <alpha-value>)',
          100: 'rgb(var(--color-dark-100) / <alpha-value>)',
          200: 'rgb(var(--color-dark-200) / <alpha-value>)',
          300: 'rgb(var(--color-dark-300) / <alpha-value>)',
          400: 'rgb(var(--color-dark-400) / <alpha-value>)',
          500: 'rgb(var(--color-dark-500) / <alpha-value>)',
          600: 'rgb(var(--color-dark-600) / <alpha-value>)',
          700: 'rgb(var(--color-dark-700) / <alpha-value>)',
          800: 'rgb(var(--color-dark-800) / <alpha-value>)',
          850: 'rgb(var(--color-dark-850) / <alpha-value>)',
          900: 'rgb(var(--color-dark-900) / <alpha-value>)',
          950: 'rgb(var(--color-dark-950) / <alpha-value>)',
        },
        // Theme-aware foreground (white in dark, near-black in light)
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        // Primary blue accent
        primary: {
          50: '#eef4ff',
          100: '#dae6ff',
          200: '#bdd4ff',
          300: '#90b8ff',
          400: '#5b8fff',
          500: '#5b7fff',
          600: '#4a6fe8',
          700: '#3d5bc9',
          800: '#354da3',
          900: '#314481',
          950: '#1e2a4f',
        },
        // Status colors
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
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
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
