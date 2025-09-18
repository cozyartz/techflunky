/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Brand colors for TechFlunky
        'brand': {
          'yellow': {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#fbbf24', // Primary yellow
            500: '#f59e0b', // Secondary yellow
            600: '#d97706',
            700: '#a16207',
            800: '#854d0e',
            900: '#713f12',
          },
          'black': {
            50: '#fafafa',
            100: '#f4f4f5',
            200: '#e4e4e7',
            300: '#d4d4d8',
            400: '#a1a1aa',
            500: '#71717a',
            600: '#52525b',
            700: '#3f3f46',
            800: '#27272a',
            900: '#18181b',
            950: '#09090b', // Deep black
          },
          'gray': {
            850: '#1e1e23',
            900: '#111827',
            950: '#0d0d0f',
          }
        },
        // Legacy bento colors (for backward compatibility)
        'bento': {
          'light': '#000000', // Changed to black for dark theme
          'border': '#fbbf24', // Changed to yellow
          'dark': '#1a1b23',
        }
      },
      gridTemplateColumns: {
        'bento': 'repeat(4, minmax(0, 1fr))',
        'bento-md': 'repeat(8, minmax(0, 1fr))',
        'bento-lg': 'repeat(12, minmax(0, 1fr))',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 0.8s ease-out',
        'fade-in-scale': 'fadeInScale 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(251, 191, 36, 0.4), 0 0 60px rgba(251, 191, 36, 0.2)',
          },
        },
        slideUp: {
          '0%': {
            transform: 'translateY(30px)',
            opacity: 0
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: 1
          },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        fadeInScale: {
          '0%': {
            opacity: 0,
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: 1,
            transform: 'scale(1)'
          },
        },
        bounceGentle: {
          '0%, 100%': {
            transform: 'translateY(0px)'
          },
          '50%': {
            transform: 'translateY(-5px)'
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'grid-pattern': 'url("data:image/svg+xml,%3csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cg fill=\'none\' stroke=\'%23fff\' stroke-width=\'1\'%3e%3cpath d=\'M0 0h60v60H0z\'/%3e%3c/g%3e%3c/svg%3e")',
      },
      backgroundSize: {
        'grid': '60px 60px',
      },
      fontFamily: {
        'sans': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
      },
    },
  },
  plugins: [],
}
