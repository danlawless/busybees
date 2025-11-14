# Settings Configuration Guide

## 🎯 New Feature: Dashboard-Based Settings

You can now configure Stripe API keys directly through the admin dashboard instead of environment variables!

## ✨ Benefits

- ✅ **No build required** - Change API keys without code deployment
- ✅ **Test ↔ Production switching** - Toggle between test and live keys via UI
- ✅ **No environment variable hassle** - Configure everything in one place
- ✅ **Secure storage** - Keys encrypted in database with RLS protection
- ✅ **Team friendly** - Multiple admins can manage settings

## 🚀 How to Use

### Step 1: Run New Migration

Run the new migration file in Supabase SQL Editor:
- File: `supabase/migrations/004_add_settings_table.sql`
- This creates the `settings` table with default entries

### Step 2: Access Settings Manager

1. Login as admin at `/pos-v2`
2. Navigate to **Settings** (new tab in admin panel)
3. You'll see the Settings Manager interface

### Step 3: Configure Stripe Keys

The Settings Manager shows these fields:

**Stripe Secret Key**
- Get from: [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
- Format: `sk_test_...` (test) or `sk_live_...` (production)
- Use test keys for development, live keys for production

**Stripe Publishable Key**
- Same location as secret key
- Format: `pk_test_...` (test) or `pk_live_...` (production)
- Must match secret key mode (test with test, live with live)

**Stripe Webhook Secret**
- Get from: Stripe Dashboard → Developers → Webhooks
- After creating webhook endpoint
- Format: `whsec_...`

### Step 4: Save and Test

1. Paste each key into the respective field
2. Click "Save" for each one
3. Keys are saved to database (encrypted for sensitive fields)
4. Test by creating a product in Stripe Product Manager

## 🔒 Security Features

### Encryption
- Keys marked as `is_encrypted` are:
  - Masked in the UI (shown as `••••xxxx`)
  - Protected by RLS policies
  - Only accessible to admins

### Access Control
- **Only admins** can view/edit settings
- Staff cannot access settings
- Customers cannot access settings
- All controlled by Row Level Security

### Fallback Strategy
If a key isn't found in database, system falls back to environment variables:
1. Check database `settings` table first
2. If not found, use environment variable
3. If neither exists, show helpful error message

## 🎛️ Available Settings

### Stripe Configuration
- `stripe_secret_key` - Stripe API secret key (encrypted)
- `stripe_publishable_key` - Stripe publishable key
- `stripe_webhook_secret` - Webhook signing secret (encrypted)

### System Settings
- `maintenance_mode` - Enable/disable customer access
- `closing_time` - Default closing time for auto-checkout
- `staff_pin` - Quick staff PIN (encrypted)

## 💡 Usage Examples

### Switching from Test to Production

**During Development:**
```
Stripe Secret Key: sk_test_51Abc...
Stripe Publishable Key: pk_test_51Abc...
```

**Going Live:**
1. Open Settings Manager
2. Replace test keys with live keys:
```
Stripe Secret Key: sk_live_51Xyz...
Stripe Publishable Key: pk_live_51Xyz...
```
3. Click Save
4. Done! No deployment needed

### Multiple Environments

You can run multiple instances with different keys:
- **Local dev**: Use test keys in database
- **Staging**: Use test keys in database
- **Production**: Use live keys in database

Each environment manages its own keys independently.

## 🔧 Troubleshooting

### "Stripe secret key not configured"
**Solution:** Go to Settings Manager and add your Stripe secret key

### "Failed to load settings"
**Solution:** 
1. Verify migration `004_add_settings_table.sql` was run
2. Check Supabase Table Editor for `settings` table
3. Verify you're logged in as admin

### Settings not saving
**Solution:**
1. Check browser console for errors
2. Verify you're logged in as admin (not staff)
3. Check Supabase logs for RLS policy errors

### Keys still not working
**Solution:**
1. Verify keys are correct (copy again from Stripe)
2. Check no extra spaces were copied
3. Ensure test keys match (both test or both live)
4. Try clearing cache and reloading

## 📊 How It Works

### Architecture

```
Admin enters key in UI
       ↓
POST /api/settings (admin auth required)
       ↓
Saved to database settings table (encrypted)
       ↓
Stripe API calls fetch key from database
       ↓
Key cached in memory for performance
       ↓
If key changes, cache invalidates
```

### Lazy Initialization

```typescript
// Old way (build-time):
const stripe = new Stripe(process.env.KEY); // Fails at build if not set

// New way (runtime):
const stripe = await getStripeClient(); // Gets key from DB at runtime
```

This allows the app to build without Stripe keys configured.

## ⚡ Quick Reference

### For First-Time Setup:
1. Run migration 004
2. Login as admin
3. Go to Settings
4. Add Stripe keys
5. Test product creation

### For Changing Keys:
1. Login as admin
2. Go to Settings
3. Update keys
4. Save
5. Done!

### For Testing Webhooks:
1. Get webhook secret from Stripe Dashboard
2. Add to Settings Manager
3. Save
4. Test webhook event
5. Check database for new records

---

**The Settings Manager makes Stripe configuration simple and secure!** 🎉

