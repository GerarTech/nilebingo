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
        'gradient-navy': 'radial-gradient(ellipse at 50% 0%, #1a2a5c 0%, #0a1322 50%, #050b14 100%)',
        'gradient-navy-subtle': 'radial-gradient(ellipse at 50% 0%, rgba(40, 55, 130, 0.15) 0%, transparent 70%)',
        'gradient-gold-shimmer': 'linear-gradient(135deg, rgba(254, 232, 0, 0.08) 0%, rgba(254, 232, 0, 0.02) 50%, rgba(254, 232, 0, 0.08) 100%)',
        'gradient-bronze': 'linear-gradient(135deg, rgba(205, 127, 50, 0.12) 0%, rgba(205, 127, 50, 0.03) 100%)',
        'gradient-silver': 'linear-gradient(135deg, rgba(192, 192, 192, 0.12) 0%, rgba(192, 192, 192, 0.03) 100%)',
        'gradient-gold-room': 'linear-gradient(135deg, rgba(254, 232, 0, 0.15) 0%, rgba(254, 232, 0, 0.03) 100%)',
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(254, 232, 0, 0.25), 0 0 40px rgba(254, 232, 0, 0.1)',
        'gold-glow-sm': '0 0 12px rgba(254, 232, 0, 0.2)',
        'gold-glow-lg': '0 0 30px rgba(254, 232, 0, 0.3), 0 0 60px rgba(254, 232, 0, 0.15)',
        'navy-glow': '0 4px 20px rgba(40, 55, 130, 0.4)',
      },
      borderColor: {
        'gold-subtle': 'rgba(254, 232, 0, 0.12)',
        'gold-medium': 'rgba(254, 232, 0, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;