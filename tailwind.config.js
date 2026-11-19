/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Geist Variable"', 'system-ui', 'sans-serif'], mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'] },
      colors: {
        paper: '#F3F5F0', card: '#FBFCF9', ink: '#16231D', mute: '#5E6B64', line: '#DDE3DA',
        accent: { DEFAULT: '#0E6B66', soft: '#DCEBE8' },
        pica: { gold: '#D9A21B', green: '#3F9A63', red: '#D2453F', black: '#343A40' }
      },
      boxShadow: { soft: '0 1px 2px rgba(22,35,29,.06), 0 8px 24px -12px rgba(22,35,29,.18)' }
    }
  },
  plugins: []
};
