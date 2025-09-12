/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          100: 'rgba(255,255,255,0.06)',
          200: 'rgba(255,255,255,0.12)'
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [],
};
