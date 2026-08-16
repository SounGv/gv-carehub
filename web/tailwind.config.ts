import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          lime: '#C4D600',
          'lime-dark': '#9AA600',
          'lime-soft': '#C7CF6E',
          charcoal: '#221E1A',
          steel: '#5C85B8',
        },
        background: '#F4F6F9',
        foreground: '#1F2937',
        warning: '#F59E0B',
        success: '#16A34A',
        error: '#DC2626',
        border: '#E5E9EF',
      },
      fontFamily: {
        sans: ['var(--font-noto-thai)', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
