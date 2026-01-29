import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary: Warm Honey Yellows
        primary: {
          50: '#FFFDF7',
          100: '#FFF8E7',
          200: '#FFF3D0',
          300: '#FFE08A',
          400: '#FFC933',
          500: '#FFB900',
          600: '#E6A600',
          700: '#CC9300',
          800: '#B38000',
          900: '#996D00',
        },
        // Secondary: Soft Blacks / Charcoals
        charcoal: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e8e8e8',
          300: '#d4d4d4',
          400: '#a8a8a8',
          500: '#8a8a8a',
          600: '#6B6B6B',
          700: '#4A4A4A',
          800: '#2B2B2B',
          900: '#1a1a1a',
        },
        // Honey shades
        honey: {
          50: '#FFFDF7',
          100: '#FFF8E7',
          200: '#FFF3D0',
          300: '#FFE08A',
          400: '#FFC933',
          500: '#FFB900',
          600: '#E6A600',
          700: '#CC9300',
          800: '#B38000',
          900: '#996D00',
        },
        // Pastel accent colors
        pastel: {
          cream: '#FFFDF7',
          yellow: '#FFF3D0',
          gold: '#FFE08A',
          mint: '#A8E6CF',
          blue: '#B4D7E8',
          coral: '#FFB3BA',
          charcoal: '#2B2B2B',
          gray: '#8a8a8a',
        },
        // Nature green
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Neutral palette
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
      fontFamily: {
        display: ['Gloria Hallelujah', 'cursive', 'system-ui', 'sans-serif'],
        body: ['Gloria Hallelujah', 'cursive', 'system-ui', 'sans-serif'],
        sans: ['Gloria Hallelujah', 'cursive', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 10px 20px -2px rgba(0, 0, 0, 0.03)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.12), 0 20px 25px -5px rgba(0, 0, 0, 0.06)',
        'honey': '0 8px 30px -5px rgba(255, 185, 0, 0.2), 0 4px 12px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
