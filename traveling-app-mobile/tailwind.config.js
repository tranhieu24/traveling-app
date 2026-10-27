/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00BCD4',
          50: '#E0F7FA',
          100: '#B2EBF2',
          200: '#80DEEA',
          300: '#4DD0E1',
          400: '#26C6DA',
          500: '#00BCD4',
          600: '#00ACC1',
          700: '#0097A7',
          800: '#00838F',
          900: '#006064',
        },
        accent: {
          DEFAULT: '#FF5A5F',
          light: '#FF7E82',
          dark: '#E00007',
        },
        dark: {
          DEFAULT: '#222222',
          muted: '#717171',
          light: '#B0B0B0',
          border: '#EBEBEB',
          bg: '#F7F7F7',
        },
      },
    },
  },
  plugins: [],
};
