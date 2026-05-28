/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './web/modules/custom/riverside_pt/templates/**/*.twig',
    './web/modules/custom/riverside_pt/src/**/*.php',
    './web/modules/custom/riverside_pt/js/components/**/*.js',
  ],
  theme: {
    extend: {
      screens: {
        // Adjusted for current hybrid usage (hero changes at sm, header/layout at md)
        'sm': '768px',   // iPad portrait + when hero layout activates
        'md': '1024px',  // Desktop start (header fixed, mission row, etc.)
        'lg': '1280px',  // Large desktop
      },
      fontFamily: {
        hedvig: ['Hedvig Letters Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
