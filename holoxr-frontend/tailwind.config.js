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
          DEFAULT: "#3BB2A5",   // teal-green primary
          600: "#2D9F93",       // darker hover teal
          50: "#E8F8F5",        // lightest teal for active states
          100: "#D1F0EB",       // light teal
        },
        surface: "#FFFFFF",      // cards, panels
        appbg: "#F5F7FA",       // global background
        textpri: "#111827",      // main text (gray-900)
        textsec: "#6B7280",      // secondary text (gray-500)
        border: "#E5E7EB",       // border color (gray-200)
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      borderRadius: {
        'card': '16px',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.1)',
        'sidebar': '2px 0 12px rgba(0,0,0,0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
