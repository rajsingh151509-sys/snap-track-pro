import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2233',
        accent: {
          DEFAULT: '#7c3aed',
          soft: '#ede9fe',
        },
        water: {
          DEFAULT: '#2dd4ff',
          soft: '#d8f6ff',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
