# Quick Start: Marketing Promos

## 🎯 TL;DR

Your banner promos now save to the database and update the website automatically!

## 🚀 Quick Setup (3 Steps)

### Step 1: Seed the Database

**Option A: SQL Script (Easiest)** ⭐
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste `scripts/seed-promos-safe.sql`
3. Click "Run"

**Option B: Command Line**
```bash
npm run seed:promos
```

### Step 2: Access Admin Panel
1. Go to `/pos`
2. Click "Staff Mode" → Enter PIN `1234`
3. Click "Marketing" tab

### Step 3: Create/Edit Promos
- Click "Add New Promo" or "Edit" on existing promos
- Fill in the details
- Click "Save Promo"
- **Done!** The banner appears on the website immediately ✨

## ✅ What Changed?

| Before | After |
|--------|-------|
| ❌ Promos hardcoded | ✅ Promos in database |
| ❌ Only saved to browser | ✅ Saved for all users |
| ❌ Didn't update website | ✅ Updates website instantly |

## 📝 Creating a Promo

**Required Fields:**
- Name: "Black Friday Sale!"
- Start Date: `2025-11-21`
- End Date: `2025-11-30`
- Discount: `30` (%)
- Description: "Huge Black Friday savings!"
- Coupon Code: `BLACKFRIDAY30`
- Banner Style: Choose from 5 styles
- Active: ✅ Enabled

**Click Save** → **Banner appears on website** → **Success!** 🎉

## 🎨 Banner Styles

- **Honeycomb** - Yellow/brand themed
- **Gradient Wave** - Blue/purple animated
- **Confetti** - Colorful celebration
- **Minimal** - Clean & simple
- **Bold Stripes** - Eye-catching

## 🔍 Troubleshooting

**Banner not showing?**
1. Check promo is "Active" (green toggle)
2. Verify today's date is within start/end range
3. Wait 5 minutes or refresh the website
4. Check browser console for errors

**Need help?** See full guide: `MARKETING_PROMOS_GUIDE.md`

---

**That's it!** Your marketing promos are now database-backed and fully functional! 🐝

