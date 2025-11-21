# Seed Scripts

## 📝 SQL Seed Scripts for Promos

You can use any of these three SQL scripts to populate your promos table:

### 1. **seed-promos-safe.sql** ⭐ RECOMMENDED
```sql
-- Safe version that checks for duplicates
-- Run multiple times without creating duplicates
```

**Use this one!** This is the safest option. It checks if each promo already exists before inserting.

**How to use:**
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the contents of `seed-promos-safe.sql`
3. Click "Run"
4. ✅ Done! Safe to run multiple times.

---

### 2. **seed-promos.sql**
```sql
-- Uses ON CONFLICT to avoid duplicates
-- Requires unique constraint on stripe_coupon_code
```

This version uses PostgreSQL's `ON CONFLICT` clause. Only use this if you have a unique constraint on `stripe_coupon_code`.

---

### 3. **seed-promos-simple.sql**
```sql
-- Simple INSERT without duplicate checking
-- WARNING: Creates duplicates if run multiple times
```

Simplest version, but will create duplicates if you run it more than once. Only use if you're certain the table is empty.

---

## 🚀 TypeScript Seed Script

### seed-promos.ts
If you prefer using Node.js/TypeScript:

```bash
npm run seed:promos
```

Or directly:

```bash
npx tsx scripts/seed-promos.ts
```

This script automatically checks for duplicates and provides nice console output.

---

## 📊 What Gets Seeded

All scripts seed 7 promotional campaigns:

| Promo | Code | Discount | Dates | Style |
|-------|------|----------|-------|-------|
| Early Bee! | EARLYBEE20 | 20% | Oct 1 - Nov 20, 2025 | honeycomb |
| Black Friday! | BLACKFRIDAY30 | 30% | Nov 21 - Nov 30, 2025 | bold-stripes |
| Cyber Monday | CYBERMONDAY40 | 40% | Nov 30 - Dec 1, 2025 | gradient-wave |
| Winter Special! | WINTERSPECIAL15 | 15% | Dec 1 - Dec 19, 2025 | honeycomb |
| Christmas Special! | XMASSGIFT25 | 25% | Dec 20 - Dec 25, 2025 | confetti |
| New Years Special! | NEWYEARS30 | 30% | Dec 29, 2025 - Jan 1, 2026 | confetti |
| Opening Special | GRANDOPEN10 | 10% | Jan 1 - Mar 1, 2026 | honeycomb |

---

## 🎯 Quick Start

**Easiest Method:**
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Copy `seed-promos-safe.sql`
4. Paste and click "Run"
5. ✅ Done!

**Alternative Method (if you prefer CLI):**
```bash
npm run seed:promos
```

---

## ✅ Verify

After running any seed script, verify the data was inserted:

```sql
SELECT
  name,
  stripe_coupon_code,
  discount_percent,
  start_date,
  end_date,
  is_active
FROM public.promos
ORDER BY start_date;
```

You should see 7 rows.

---

## 🧹 Clean Up (Optional)

If you need to remove all seeded promos and start over:

```sql
-- WARNING: This deletes ALL promos!
DELETE FROM public.promos;
```

Then run the seed script again.

---

## 🆘 Troubleshooting

**"Table promos does not exist"**
- Run the migration first: `supabase/migrations/001_create_schema.sql`

**"Permission denied"**
- Make sure you're running the SQL as a user with INSERT permissions
- Try running in Supabase SQL Editor (has admin permissions)

**Duplicates created**
- Use `seed-promos-safe.sql` instead
- Or delete duplicates and re-run

---

**Questions?** See `MARKETING_PROMOS_GUIDE.md` for full documentation.

