import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#283782',
          light: '#3547a0',
          card: '#1e2d6e',
        },
        gold: {
          DEFAULT: '#FEE800',
          dark: '#e5d100',
          light: '#fef04d',
        },
        accent: {
          violet: '#8b5cf6',
          green: '#10b981',
          red: '#ef4444',
          blue: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #FEE800 0%, #e5d100 100%)',
        'gradient-violet': 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        'gradient-green': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(254, 232, 0, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;