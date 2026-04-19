/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#06070a',
        panel: '#11151d',
        glow: '#7cf7c8',
        neon: '#6ee7ff',
        rose: '#ff6b9e',
        line: 'rgba(255, 255, 255, 0.08)',
      },
      boxShadow: {
        glass: '0 25px 80px rgba(0, 0, 0, 0.45)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        flashUp: {
          '0%': { backgroundColor: 'rgba(16, 185, 129, 0.32)' },
          '100%': { backgroundColor: 'rgba(255, 255, 255, 0)' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(244, 63, 94, 0.3)' },
          '100%': { backgroundColor: 'rgba(255, 255, 255, 0)' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        flashUp: 'flashUp 900ms ease-out',
        flashDown: 'flashDown 900ms ease-out',
      },
    },
  },
  plugins: [],
};
