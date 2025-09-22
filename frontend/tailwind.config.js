/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        // 10 Minute School Brand Colors
        brand: {
          red: '#dc2626',      // Primary brand red
          'red-light': '#fef2f2', // Light red for backgrounds
          'red-dark': '#991b1b',   // Dark red for dark theme
          white: '#ffffff',     // Primary white
          black: '#111827',     // Primary black/dark text
          gray: {
            50: '#f9fafb',      // Light background
            100: '#f3f4f6',     // Card backgrounds
            200: '#e5e7eb',     // Borders
            300: '#d1d5db',     // Disabled states
            400: '#9ca3af',     // Placeholder text
            500: '#6b7280',     // Secondary text
            600: '#4b5563',     // Primary text
            700: '#374151',     // Headings
            800: '#1f2937',     // Dark headings
            900: '#111827',     // Darkest text
          }
        },
        // Semantic colors using brand palette
        primary: {
          DEFAULT: '#dc2626',   // Brand red
          50: '#fef2f2',
          100: '#fee2e2', 
          500: '#dc2626',       // Main brand red
          600: '#b91c1c',       // Hover state
          700: '#991b1b',       // Active state
        }
      },
    },
  },
  plugins: [],
}