# Marketing Promos System - Complete Guide

## 🎯 Overview

The marketing promos system allows you to create, edit, and manage promotional campaigns that appear as banners on your website. Changes made in the admin panel now **automatically save to the database** and appear on the live website!

## ✅ What's Fixed

### Before (The Problem)
- ❌ Promos were hardcoded in `promoConstants.ts`
- ❌ Changes only saved to localStorage (browser-specific)
- ❌ Website didn't update when you saved promos in the admin panel
- ❌ Promos didn't persist across different browsers/devices

### After (The Solution)
- ✅ Promos save to Supabase database
- ✅ Changes in admin panel immediately affect the live website
- ✅ Promos persist across all browsers and devices
- ✅ Website automatically fetches latest promos from database
- ✅ Offline fallback to localStorage still works

## 🚀 Getting Started

### 1. Seed Initial Promos (First Time Setup)

You have two options to populate your database:

**Option A: SQL Script (Recommended for SQL Editor)** ⭐

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the contents of `scripts/seed-promos-safe.sql`
4. Paste and click "Run"

This is the easiest method and works great in the Supabase Dashboard!

**Option B: Command Line (TypeScript/Node.js)**

```bash
npm run seed:promos
```

Or use npx directly:

```bash
npx tsx scripts/seed-promos.ts
```

Both methods are idempotent - they won't create duplicates if you run them multiple times.

This will create 7 promotional campaigns (currently disabled - dates set to 2024):
- Early Bee! (20% off) - Oct 1 to Nov 20, 2024
- Black Friday! (30% off) - Nov 21 to Nov 30, 2024
- Cyber Monday (40% off) - Nov 30 to Dec 1, 2024
- Winter Special! (15% off) - Dec 1 to Dec 19, 2024
- Christmas Special! (25% off) - Dec 20 to Dec 25, 2024
- New Years Special! (30% off) - Dec 29, 2024 to Jan 1, 2025
- Opening Special (10% off) - Jan 1 to Mar 1, 2025

**Note:** The seed script is idempotent - it won't create duplicates if you run it multiple times.

### 2. Access the Admin Panel

1. Navigate to `/pos` in your browser
2. Click the "Staff Mode" button (the bee icon)
3. Enter the staff PIN (default: `1234`)
4. Click on the "Marketing" tab

## 📝 Managing Promos

### Creating a New Promo

1. In the Marketing tab, click "Add New Promo"
2. Fill in the promo details:
   - **Name**: Display name (e.g., "Spring Sale!")
   - **Start Date**: When the promo becomes active
   - **End Date**: When the promo expires
   - **Discount %**: Percentage off (1-100)
   - **Description**: Short message for the banner
   - **Stripe Coupon Code**: Uppercase code customers use at checkout
   - **Banner Style**: Visual style (honeycomb, gradient-wave, confetti, minimal, bold-stripes)
   - **Active**: Toggle to enable/disable the promo
3. Click "Save Promo"

**The promo is now saved to the database and will appear on the website!** ✨

### Editing a Promo

1. Find the promo in the list
2. Click "Edit"
3. Modify any fields
4. Click "Save Promo"

**Changes are immediately reflected on the website!**

### Toggling a Promo

Click the green/red toggle button to activate or deactivate a promo without deleting it.

### Deleting a Promo

1. Click the "Delete" button (twice to confirm)
2. The promo is permanently removed from the database

## 🎨 Banner Styles

Choose from 5 different visual styles:

- **Honeycomb**: Yellow honeycomb pattern (default, brand-themed)
- **Gradient Wave**: Blue/purple gradient with wave animation
- **Confetti**: Colorful confetti background (great for celebrations)
- **Minimal**: Clean, simple design
- **Bold Stripes**: Eye-catching diagonal stripes

## 🔄 How the System Works

### Data Flow

```
Admin Panel (POS)
    ↓
    Saves to Database (/api/promos)
    ↓
Website (Layout.tsx)
    ↓
    Fetches from Database (/api/promos?active=true)
    ↓
    Displays Active Promo Banner
```

### API Endpoints

- `GET /api/promos` - Fetch all promos
- `GET /api/promos?active=true` - Fetch only active promos
- `POST /api/promos` - Create a new promo
- `PUT /api/promos` - Update an existing promo
- `DELETE /api/promos?id=<id>` - Delete a promo

### Active Promo Selection

The system automatically:
1. Filters promos by date range (start_date ≤ today ≤ end_date)
2. Only shows active promos (`is_active = true`)
3. Displays the promo with the **highest discount percentage**
4. Rotates banner messages every 5 seconds

### Banner Dismissal

- Users can dismiss the banner by clicking the X button
- The banner will reappear the next day (resets at midnight)
- Dismissal state is tracked per promo ID in localStorage

## 🛠️ Technical Details

### Database Schema

```sql
CREATE TABLE promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  description TEXT NOT NULL,
  stripe_coupon_id TEXT,
  stripe_coupon_code TEXT NOT NULL,
  banner_style banner_style DEFAULT 'honeycomb',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Offline Fallback

The system maintains a localStorage cache for offline access:
- Website tries to fetch from database first
- Falls back to localStorage if database is unavailable
- Last resort: uses hardcoded constants from `promoConstants.ts`

### Auto-Refresh

The website automatically refreshes promo data every 5 minutes to catch:
- Newly activated promos
- Expired promos
- Changes made in the admin panel

## 🐛 Troubleshooting

### Promo Not Showing on Website?

**Check:**
1. ✅ Is the promo marked as "Active"?
2. ✅ Is today's date within the start/end date range?
3. ✅ Did you save the promo (check the database)?
4. ✅ Try refreshing the website (wait up to 5 minutes for auto-refresh)

### Changes Not Appearing?

1. Verify the promo was saved (check console for errors)
2. Clear browser cache and reload
3. Wait 5 minutes for auto-refresh
4. Check browser console for API errors

### Seed Script Fails?

Make sure you have the environment variables set:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 Best Practices

1. **Plan Ahead**: Create promos in advance with future start dates
2. **Test First**: Create a test promo and verify it appears correctly
3. **Unique Codes**: Use unique Stripe coupon codes for each promo
4. **Clear Names**: Use descriptive names to identify promos easily
5. **Monitor Dates**: Set appropriate start/end dates to avoid overlaps
6. **Deactivate vs Delete**: Deactivate promos you might reuse instead of deleting

## 🎉 Success!

Your marketing promos system is now fully integrated with the database! Any changes you make in the admin panel will automatically appear on the live website.

**Next Steps:**
1. Run the seed script to populate initial promos
2. Test creating a new promo in the admin panel
3. Visit the website to see your banner in action!

---

**Questions or Issues?** Check the console logs for detailed error messages and debugging information.

