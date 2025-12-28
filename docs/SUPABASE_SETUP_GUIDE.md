# Supabase Integration Setup Guide

## 🎉 What's Been Implemented

### ✅ Completed Components

1. **Supabase Configuration**
   - Browser and server Supabase clients
   - TypeScript types for database schema
   - Middleware for auth session refresh

2. **Database Schema**
   - Complete SQL migrations for all tables (users, children, passes, purchases, sessions, promos, etc.)
   - Row Level Security (RLS) policies for data protection
   - Database functions and triggers for business logic
   - Automated maintenance functions

3. **Authentication System**
   - Email/password and phone OTP authentication
   - Role-based access control (customer, staff, admin)
   - Auth helpers and custom hooks (useAuth, useUser)
   - AuthGuard and RoleGuard components

4. **Stripe Integration**
   - Stripe client configuration
   - Product, price, and coupon management functions
   - Subscription management
   - API routes for managing Stripe products from the platform
   - Webhook handler for automatic payment sync

5. **Service Layer**
   - Customer/user management
   - Purchase tracking
   - Session management
   - Pass management
   - Promo management

### 🚧 Remaining Tasks

- Build REST API routes for entities
- Create data fetching hooks with polling
- Migrate POS components from localStorage to Supabase
- Add Stripe management UI to AdminPanel
- Build customer portal
- Testing
- Deployment

## 📋 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and name your project (e.g., "busy-bees-pos")
4. Set a strong database password and save it
5. Choose a region close to your users
6. Wait for project to be created (~2 minutes)

### Step 2: Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration files in order:

   **First: 001_create_schema.sql**
   - Copy content from `supabase/migrations/001_create_schema.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Verify: Go to Table Editor - you should see all tables

   **Second: 002_create_rls_policies.sql**
   - Copy content from `supabase/migrations/002_create_rls_policies.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Verify: Tables should now show "RLS enabled"

   **Third: 003_create_functions.sql**
   - Copy content from `supabase/migrations/003_create_functions.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Verify: Go to Database > Functions to see created functions

### Step 3: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the following values:
   - Project URL (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - `anon` `public` key
   - `service_role` `secret` key (for server-side operations)

### Step 4: Configure Environment Variables

1. Create `.env.local` file in project root (it's git-ignored)
2. Add your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 5: Get Stripe Credentials

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers > API keys**
3. Copy:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)
4. Add to `.env.local`

### Step 6: Test Local Development

```bash
npm run dev
```

Visit `http://localhost:3000` and verify the app loads.

### Step 7: Create Initial Admin User

Option 1: Via Supabase Dashboard
1. Go to **Authentication > Users**
2. Click "Add user"
3. Enter email and password
4. After creating, go to **Table Editor > users**
5. Find the user and change `role` to `admin`

Option 2: Via SQL
```sql
-- Get the user ID from auth.users first
SELECT id, email FROM auth.users;

-- Then update the role
UPDATE users SET role = 'admin' WHERE id = 'user-id-here';
```

## 🔧 Stripe Webhook Setup (For Production)

### Development (Local Testing)

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Copy the webhook signing secret (starts with `whsec_`) to `.env.local`

### Production (Vercel)

1. Deploy to Vercel (see deployment section)
2. Get your production URL (e.g., `https://busybees.vercel.app`)
3. Go to Stripe Dashboard > **Developers > Webhooks**
4. Click "Add endpoint"
5. Enter URL: `https://your-domain.com/api/stripe/webhook`
6. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `charge.refunded`
7. Copy the signing secret and add to Vercel environment variables

## 🎯 Creating Products in Stripe via Platform

Once deployed, staff/admin can create products directly in Stripe from the Admin Panel:

1. Login as admin
2. Navigate to Admin Panel > Stripe Products
3. Click "Create Product"
4. Fill in details (name, price, type)
5. System will:
   - Create product in Stripe
   - Create price in Stripe
   - Generate payment link
   - Save to Supabase database

## 📊 Database Maintenance

The system includes automated functions that should run periodically:

```sql
SELECT run_maintenance_tasks();
```

This function:
- Expires old passes
- Auto-checks out overdue sessions

### Setting Up Automated Maintenance

Option 1: pg_cron (if available)
```sql
SELECT cron.schedule('maintenance', '0 * * * *', $$
  SELECT run_maintenance_tasks();
$$);
```

Option 2: External Cron Job
Create an API endpoint and call it from a service like:
- Vercel Cron Jobs
- GitHub Actions
- External cron service

## 🔐 Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit API keys or secrets
- [ ] Use test keys for development
- [ ] Use production keys only in Vercel
- [ ] RLS policies are enabled on all tables
- [ ] Webhook signatures are verified
- [ ] Staff PIN is changed from default "1234"

## 📱 Authentication Flows

### Customer Authentication
1. Phone OTP (recommended for kiosk)
2. Email + Password
3. Magic link

### Staff Authentication
1. Email + Password
2. PIN verification (additional layer)

## 🚀 Next Steps

1. **Complete API Routes**: Finish REST endpoints for all entities
2. **Create Data Hooks**: Build custom hooks with SWR for data fetching
3. **Migrate POS Components**: Update to use Supabase instead of localStorage
4. **Build Customer Portal**: Create customer-facing pages
5. **Test Everything**: Comprehensive testing of all features
6. **Deploy**: Push to Vercel and configure production webhooks

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel Deployment](https://vercel.com/docs)

## 🆘 Troubleshooting

### Common Issues

**"User not found in users table"**
- Ensure user profile is created after signup
- Check RLS policies allow user creation

**"Unauthorized"**
- Verify auth token is valid
- Check user role matches required role

**"Webhook signature verification failed"**
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Use Stripe CLI for local testing

**"Database connection failed"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

### Getting Help

1. Check Supabase logs in dashboard
2. Check Vercel function logs
3. Check Stripe webhook event logs
4. Enable debug logging in development

## 💡 Tips

- Start with test mode in Stripe
- Use Stripe test cards for development
- Test all auth flows before production
- Set up error monitoring (e.g., Sentry)
- Monitor database performance
- Set up backups in Supabase

---

**Need help? Check the README or create an issue.**

