# Supabase Database Migrations

## How to Apply Migrations

These SQL migration files should be run in order in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the content of each migration file in order:
   - `001_create_schema.sql` - Creates all tables, enums, and triggers
   - `002_create_rls_policies.sql` - Sets up Row Level Security policies
   - `003_create_functions.sql` - Creates business logic functions

5. Run each migration
6. Verify tables were created in **Table Editor**

## After Running Migrations

1. **Generate TypeScript Types** (optional):
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
   ```

2. **Update Environment Variables**:
   - Copy your Supabase URL and anon key from Settings > API
   - Update `.env.local` with your actual credentials

3. **Test the Schema**:
   - Verify RLS policies work by testing queries in SQL Editor
   - Try inserting test data
   - Verify triggers and functions work

## Maintenance

The `run_maintenance_tasks()` function should be called periodically to:
- Auto-expire old passes
- Auto-checkout sessions that have passed their checkout time

You can set this up with:
1. Supabase Edge Functions
2. External cron job calling an API endpoint
3. pg_cron extension (if available)

## Schema Overview

### Core Tables
- `users` - Extends Supabase auth.users with custom fields
- `children` - Customer children profiles
- `passes` - Day/weekly/monthly pass products
- `party_packages` - Party package products
- `products` - Food, beverage, and retail items
- `purchases` - Customer purchase records
- `sessions` - Active play sessions
- `promos` - Marketing promotions
- `volume_discounts` - Bulk purchase discounts
- `saved_cards` - Customer payment methods

### Security
- Row Level Security (RLS) enabled on all tables
- Role-based access control (customer, staff, admin)
- Customers can only access their own data
- Staff can manage all operational data
- Admins have full access

### Automation
- Auto-update timestamps on record changes
- Auto-calculate pass expiry from first use
- Auto-increment session counts
- Auto-expire old passes
- Auto-checkout overdue sessions

