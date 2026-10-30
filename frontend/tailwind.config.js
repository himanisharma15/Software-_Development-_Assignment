/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        'surface-raised': '#FFFFFF',
        border: '#E5E7EB',
        'row-border': '#F0F0F0',
        'row-hover': '#FAFAFA',
        primary: '#16A34A',
        'primary-hover': '#15803D',
        'primary-tint': '#E8F5EC',
        text: '#111111',
        muted: '#6B7280',
        success: '#555555',
        'success-tint': '#F1F1F1',
        warning: '#D9631E',
        'warning-tint': '#FFE9D9',
        danger: '#C62828',
        'danger-tint': '#FDE8E8',
        overlay: 'rgba(17, 17, 17, 0.28)',
        focus: 'rgba(22, 163, 74, 0.18)'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      borderRadius: {
        control: '8px',
        panel: '8px',
        card: '8px',
        pill: '9999px'
      },
      boxShadow: {
        panel: '0 1px 3px rgba(17, 17, 17, 0.08)',
        focus: '0 0 0 3px rgba(22, 163, 74, 0.18)'
      }
    }
  },
  plugins: []
};
