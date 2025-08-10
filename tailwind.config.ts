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
        // Busy Bees Brand Colors - Enhanced Palette
        primary: {
          50: '#fffef7',  // Lightest honey cream
          100: '#fffaeb',  // Soft honey
          200: '#fef3c7',  // Light honey
          300: '#fde68a',  // Warm honey
          400: '#fbbf24',  // Golden honey
          500: '#f59e0b',  // Main bee yellow
          600: '#d97706',  // Deep honey
          700: '#b45309',  // Rich amber
          800: '#92400e',  // Dark amber
          900: '#78350f',  // Deepest amber
        },
        // Pastel blacks and grays
        charcoal: {
          50: '#f8f8f8',   // Softest gray
          100: '#f1f1f1',  // Light pastel gray
          200: '#e4e4e4',  // Pastel gray
          300: '#d1d1d1',  // Medium pastel gray
          400: '#a8a8a8',  // Soft charcoal
          500: '#737373',  // Medium charcoal
          600: '#525252',  // Deep charcoal
          700: '#404040',  // Rich charcoal
          800: '#262626',  // Dark charcoal
          900: '#171717',  // Deepest charcoal
        },
        // Honeycomb accent colors
        honey: {
          50: '#fefdf8',   // Cream white
          100: '#fef9e7',  // Pale cream
          200: '#fef3c7',  // Light cream
          300: '#fde68a',  // Soft yellow
          400: '#facc15',  // Bright honey
          500: '#eab308',  // Rich honey
          600: '#ca8a04',  // Deep honey
          700: '#a16207',  // Dark honey
          800: '#854d0e',  // Amber
          900: '#713f12',  // Deep amber
        },
        // Keep secondary for nature elements
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Nature green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Refined neutral palette
        neutral: {
          50: '#fafafa',   // Pure light
          100: '#f5f5f5',  // Soft light
          200: '#e5e5e5',  // Light gray
          300: '#d4d4d4',  // Medium light
          400: '#a3a3a3',  // Medium gray
          500: '#737373',  // True gray
          600: '#525252',  // Dark gray
          700: '#404040',  // Deep gray
          800: '#262626',  // Very dark
          900: '#171717',  // Almost black
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
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
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
