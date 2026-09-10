import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626', // Primary Enterprise Red
          700: '#b91c1c',
          800: '#991b1b', // Primary Maroon (Dark Mode Accent)
          900: '#7f1d1d',
          950: '#450a0a',
        },
        surface: {
          light: '#ffffff',
          dark: '#0b0f17',
          cardLight: '#ffffff',
          cardDark: '#111827',
          borderLight: '#e2e8f0',
          borderDark: '#1f2937',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
