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
        'md': '920px',
      },
    },
  },
  plugins: [],
}
