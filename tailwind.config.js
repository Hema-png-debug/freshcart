/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        'surface-2': 'var(--c-surface-2)',
        ink: 'var(--c-ink)',
        muted: 'var(--c-muted)',
        line: 'var(--c-line)',
        primary: 'var(--c-primary)',
        'primary-strong': 'var(--c-primary-strong)',
        'on-primary': 'var(--c-on-primary)',
        'primary-soft': 'var(--c-primary-soft)',
        accent: 'var(--c-accent)',
        'accent-soft': 'var(--c-accent-soft)',
        danger: 'var(--c-danger)',
        'danger-soft': 'var(--c-danger-soft)',
        success: 'var(--c-success)',
        'success-soft': 'var(--c-success-soft)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        body: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
        field: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 34 24 / 0.05), 0 8px 24px -12px rgb(16 34 24 / 0.12)',
        nav: '0 -4px 24px -8px rgb(16 34 24 / 0.15)',
      },
    },
  },
  plugins: [],
}
