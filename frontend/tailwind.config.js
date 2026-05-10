/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        mist: '#f6f7fb',
        marine: '#2563eb',
        coral: '#f97316',
        jade: '#0f766e',
        berry: '#be185d'
      },
      boxShadow: {
        soft: '0 18px 50px -28px rgb(15 23 42 / 0.35)'
      }
    }
  },
  plugins: []
};
