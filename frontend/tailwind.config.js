/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1B365D',
          900: '#102a43',
        },
        // Shared UI Design Tokens
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          active: 'var(--brand-active)',
          dark: 'var(--brand-dark)',
          light: 'var(--brand-light)',
          soft: 'var(--bg-brand-soft)',
        },
        'bg-brand-soft': 'var(--bg-brand-soft)',
        'text-main': 'var(--text-main)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'bg-app': 'var(--bg-app)',
        'bg-card': 'var(--bg-card)',
        'neutral-bg': 'var(--neutral-bg)',
        'border-standard': 'var(--border-standard)',
        'border-divider': 'var(--border-divider)',
        'status-danger': {
          DEFAULT: 'var(--status-danger)',
          hover: 'var(--status-danger-hover)',
          bg: 'var(--status-danger-bg)',
          border: 'var(--status-danger-border)',
        },
        'status-warning': {
          DEFAULT: 'var(--status-warning)',
          hover: 'var(--status-warning-hover)',
          bg: 'var(--status-warning-bg)',
          border: 'var(--status-warning-border)',
        },
        'status-success': {
          DEFAULT: 'var(--status-success)',
          hover: 'var(--status-success-hover)',
          bg: 'var(--status-success-bg)',
          border: 'var(--status-success-border)',
        },
        'status-info': {
          DEFAULT: 'var(--status-info)',
          hover: 'var(--status-info-hover)',
          bg: 'var(--status-info-bg)',
          border: 'var(--status-info-border)',
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
