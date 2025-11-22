/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#fcd34d',
        'primary-dark': '#f59e0b',
        secondary: '#d946ef',
        'secondary-dark': '#c026d3',
        dark: '#1f2937',
        light: '#f9fafb',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}