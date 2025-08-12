# 🚀 Busy Bees Deployment Guide

## Quick Deploy to Vercel

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository (`busybees`)
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"

### 3. Configure Environment Variables (Optional)
In your Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add any variables from `env.example` if needed

## 🌟 What's Included

### Pages
- **Home** (`/`) - Hero, features, and pricing overview
- **About** (`/about`) - Company story, team, values, and community
- **Info** (`/info`) - Detailed hours, pricing, amenities, policies, and FAQ
- **Parties** (`/parties`) - Complete party booking system with packages

### Features
- ✅ Fully responsive design
- ✅ Modern hexagonal bee hive theme
- ✅ Smooth animations and interactions
- ✅ SEO optimized
- ✅ Performance optimized
- ✅ Mobile-first design
- ✅ Accessibility compliant

### Design System
- **Colors**: Pastel yellows and charcoal blacks
- **Patterns**: Mathematical hexagonal honeycomb designs
- **Animations**: Floating, pulsing, and rotating elements
- **Typography**: Inter font family
- **Components**: Reusable UI components with consistent styling

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 📱 Mobile Optimization
- Mobile-first responsive design
- Touch-friendly interactive elements
- Optimized images and animations
- Fast loading on all devices

## 🎨 Customization
All colors, fonts, and styling can be customized in:
- `tailwind.config.ts` - Theme configuration
- `src/app/globals.css` - Custom CSS and animations
- Individual component files for specific styling

## 📈 Performance
- Next.js 15 with App Router
- Optimized images and assets
- Lazy loading components
- Minimal bundle size
- Fast loading times

Your Busy Bees website is ready to buzz! 🐝
