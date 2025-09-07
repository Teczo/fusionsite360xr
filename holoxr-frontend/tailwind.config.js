/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00E676",   // main logo green
          600: "#00C853",       // darker hover green
        },
        surface: "#1E1E1E",      // cards, panels
        appbg: "#121212",        // global background
        textpri: "#FFFFFF",      // main text
        textsec: "#B0BEC5",      // secondary text
      },
    },
  },
  plugins: [],
}
