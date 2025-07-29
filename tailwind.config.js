// tailwind.config.ts - Configuración personalizada
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores de marca para Apparcar
        'apparcar-blue': {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        'apparcar-green': {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'slide-down': 'slideDown 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        slideDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // solo aplicar a elementos con class="form-input" etc.
    }),
  ],
}