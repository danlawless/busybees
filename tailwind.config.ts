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
        // Enhanced Pastel Primary Colors
        primary: {
          50: '#fffef9',   // Cream white
          100: '#fef7d3',  // Pale pastel yellow
          200: '#fef3c7',  // Light pastel yellow
          300: '#f5d565',  // Soft honey pastel
          400: '#f0c674',  // Medium honey pastel
          500: '#e6b800',  // Rich honey
          600: '#d4a300',  // Deep honey
          700: '#b8900',   // Amber
          800: '#996600',  // Dark amber
          900: '#7a5200',  // Deepest amber
        },
        // Enhanced Pastel Charcoals
        charcoal: {
          50: '#fafafa',   // Softest pastel gray
          100: '#f5f5f5',  // Light pastel gray
          200: '#e8e8e8',  // Soft pastel gray
          300: '#d4d4d4',  // Medium pastel gray
          400: '#a8a8a8',  // Soft charcoal pastel
          500: '#8a8a8a',  // Medium charcoal pastel
          600: '#666666',  // Deep charcoal pastel
          700: '#404040',  // Rich charcoal
          800: '#2d2d2d',  // Dark charcoal
          900: '#1a1a1a',  // Deepest charcoal
        },
        // Enhanced Pastel Honey Colors
        honey: {
          50: '#fffef9',   // Pure cream white
          100: '#fff9e6',  // Pale pastel yellow
          200: '#ffecb3',  // Light pastel gold
          300: '#f5d565',  // Soft honey pastel
          400: '#f0c674',  // Medium honey pastel
          500: '#e6b800',  // Rich honey (primary)
          600: '#d4a300',  // Deep honey
          700: '#b89000',  // Dark honey
          800: '#996600',  // Amber
          900: '#7a5200',  // Deep amber
        },
        // Pastel accent colors
        pastel: {
          cream: '#fffef9',
          yellow: '#fff9e6', 
          gold: '#ffecb3',
          charcoal: '#2d2d2d',
          gray: '#8a8a8a',
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
