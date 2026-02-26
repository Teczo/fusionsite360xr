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
        brandend: "#6CCF6A",     // gradient end for progress bars / CTA gradient
        accent: "#2EA6D7",       // interactive accent blue
        surface: "#FFFFFF",      // cards, panels
        appbg: "#f8fafc",        // global background (ES slate-50)
        textpri: "#111827",      // main text (gray-900)
        textsec: "#6B7280",      // secondary text (gray-500)
        texttert: "#9CA3AF",     // tertiary text / timestamps (gray-400)
        border: "#e2e8f0",       // border color (ES slate-200)
        borderlight: "#f1f5f9",  // subtle border (ES slate-100)
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card:        'none',
        'card-hover': '0 4px 6px rgba(0,0,0,0.07)',
        sidebar:     '2px 0 12px rgba(0,0,0,0.04)',
        header:      '0 2px 8px rgba(0,0,0,0.04)',
        medium:      '0 4px 16px rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['Syne', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Custom screens for orientation-based responsive behavior
  screens: {
    landscape: { raw: '(orientation: landscape)' },
  },
}
