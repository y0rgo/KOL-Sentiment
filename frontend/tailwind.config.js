/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A4A',
          50: '#E8EBF0',
          100: '#D1D7E1',
          200: '#A3AFC3',
          300: '#7587A5',
          400: '#485F87',
          500: '#1B2A4A',
          600: '#16223B',
          700: '#101A2D',
          800: '#0B111E',
          900: '#050910',
        },
        teal: {
          DEFAULT: '#2A9D8F',
          50: '#E6F5F3',
          100: '#CCEBE7',
          200: '#99D7CF',
          300: '#66C3B7',
          400: '#33AF9F',
          500: '#2A9D8F',
          600: '#227E72',
          700: '#195E56',
          800: '#113F39',
          900: '#081F1D',
        },
        slate: {
          DEFAULT: '#4A5568',
        },
        background: '#F7F8FA',
      },
    },
  },
  plugins: [],
}
