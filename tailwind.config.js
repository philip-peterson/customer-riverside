/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './web/modules/custom/riverside_pt/templates/**/*.twig',
    './web/modules/custom/riverside_pt/src/**/*.php',
    './web/modules/custom/riverside_pt/js/components/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        'pt-blue': {
          50:  '#e8f2f6',
          100: '#dde8f0',
          200: '#b8d4dc',
          300: '#9dbdcb',
          400: '#86aab6',
          500: '#306f8e',
          600: '#1f5a6e',
        },
        'pt-sage': {
          400: '#83a1a1',
          500: '#6f8f96',
        },
        'pt-navy': '#1e3a5f',
      },
      screens: {
        // Adjusted for current hybrid usage (hero changes at sm, header/layout at md)
        'sm': '768px',   // iPad portrait + when hero layout activates
        'md': '1024px',  // Desktop start (header fixed, mission row, etc.)
        'lg': '1280px',  // Large desktop
        '2xl': '1780px', // Ultra-wide
      },
      fontFamily: {
        hedvig: ['Hedvig Letters Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
