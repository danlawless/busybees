# Comprehensive Testing Guide

## 🧪 Testing Checklist

### Phase 1: Database & Infrastructure Testing

#### 1.1 Verify Database Setup
```bash
# Start dev server
npm run dev
```

✅ **Test Database Tables**
1. Go to Supabase Dashboard > Table Editor
2. Verify all tables exist:
   - users
   - children
   - passes
   - party_packages
   - products
   - purchases
   - sessions
   - promos
   - volume_discounts
   - saved_cards

✅ **Test RLS Policies**
1. Go to Supabase Dashboard > Authentication > Policies
2. Verify RLS is enabled on all tables
3. Check policy count (should have 30+ policies)

#### 1.2 Test API Endpoints

**Test Passes Endpoint**
```bash
curl http://localhost:3000/api/passes
```
Expected: JSON array of passes (empty initially)

**Test Promos Endpoint**
```bash
curl http://localhost:3000/api/promos
```
Expected: JSON array of promos

**Test Customers (requires auth)**
```bash
curl http://localhost:3000/api/customers
```
Expected: 401 Unauthorized (no auth token)

### Phase 2: Authentication Testing

#### 2.1 Create Admin User

**Via Supabase Dashboard:**
1. Navigate to Authentication > Users
2. Click "Add user"
3. Email: `admin@busybees.com`
4. Password: Create secure password (save it!)
5. Click "Add user"

**Set Admin Role:**
1. Go to Table Editor > users
2. Find the user you just created
3. Click to edit
4. Change `role` from `customer` to `admin`
5. Save

#### 2.2 Test Admin Login

1. Visit `http://localhost:3000/pos-v2`
2. Click "Staff / Admin Access"
3. Enter admin credentials
4. Expected: Should redirect to admin dashboard

#### 2.3 Test Customer Registration

1. Visit `http://localhost:3000/pos-v2`
2. Enter a phone number (e.g., 555-123-4567)
3. Fill in name and email
4. Click "Create Account"
5. Check Supabase Dashboard > Authentication > Users
6. Verify new user was created with role='customer'

### Phase 3: Stripe Integration Testing

#### 3.1 Set Up Stripe Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret (starts with `whsec_`) and add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

Restart your dev server after adding the secret.

#### 3.2 Test Product Creation

1. Login as admin
2. Navigate to Stripe Product Manager
3. Click "Create Stripe Product"
4. Fill in:
   - Name: "Test Day Pass"
   - Description: "Test product"
   - Type: "Pass"
   - Category: "Day"
   - Price: "17.00"
5. Click "Create in Stripe"
6. Expected results:
   - ✅ Product created in Stripe (check Stripe Dashboard > Products)
   - ✅ Price created in Stripe
   - ✅ Payment link generated
   - ✅ Record created in Supabase `passes` table

**Verify in Stripe Dashboard:**
- Go to Products
- Find "Test Day Pass"
- Click to view - should have price of $17.00
- Check if payment link exists

#### 3.3 Test Coupon Creation

1. Navigate to Stripe Coupon Manager
2. Click "Create Coupon"
3. Fill in:
   - Coupon Code: "TEST25"
   - Discount Percent: "25"
   - Duration: "Once"
   - Enable "Create promo banner"
   - Set dates and description
4. Click "Create Coupon"
5. Expected results:
   - ✅ Coupon created in Stripe (check Stripe Dashboard > Coupons)
   - ✅ Promo created in database if checkbox was checked

#### 3.4 Test Webhook Payment Sync

```bash
# Trigger a test payment event
stripe trigger payment_intent.succeeded
```

**Check webhook logs:**
1. Terminal running `stripe listen` should show event received
2. Check your dev server logs
3. Should see: "Purchase record created successfully"

**Verify in database:**
1. Go to Supabase Dashboard > Table Editor > purchases
2. Should see a new purchase record created

### Phase 4: POS System Testing

#### 4.1 Test Customer Check-In Flow

1. Visit `/pos-v2`
2. Login as a customer
3. Click "Check In"
4. Select a pass
5. Click "Check In"
6. Expected:
   - Session created in database
   - Session appears in active sessions
   - used_sessions incremented

**Verify:**
```bash
# Check sessions table
curl "http://localhost:3000/api/sessions?customer_id=USER_ID"
```

#### 4.2 Test Session Auto-Expiry

1. Create a session with short auto_checkout_time (manually in DB or via API)
2. Wait for auto_checkout_time to pass
3. Run maintenance function:
```sql
SELECT auto_checkout_sessions();
```
4. Verify session is marked as ended

#### 4.3 Test Purchase Creation (Staff)

1. Login as staff/admin
2. Create a test purchase manually
3. Verify it appears in customer's account
4. Verify it appears in today's purchases

### Phase 5: Customer Portal Testing

#### 5.1 Test Dashboard
1. Login as customer
2. Visit `/customer/dashboard`
3. Verify displays:
   - Active passes count
   - Children count
   - Active sessions
   - Quick action cards

#### 5.2 Test Passes Page
1. Visit `/customer/passes`
2. Verify shows all passes
3. Check usage bars display correctly
4. Verify expired passes show separately

#### 5.3 Test Children Management
1. Visit `/customer/children`
2. Click "Add Child"
3. Fill in name and birthdate
4. Submit
5. Verify child appears in list
6. Test "Sign Waiver" button
7. Verify waiver status updates

#### 5.4 Test Profile Page
1. Visit `/customer/profile`
2. Click "Edit"
3. Update name and email
4. Save
5. Verify changes persist
6. Refresh page - changes should still be there

### Phase 6: Data Polling Testing

#### 6.1 Test Auto-Refresh

1. Open customer dashboard in one browser tab
2. Open admin panel in another tab (or different browser)
3. Create a new purchase in admin panel
4. Watch customer dashboard
5. Expected: Purchase should appear within 5-10 seconds

#### 6.2 Test SWR Cache

1. Navigate to dashboard
2. Click to another page
3. Return to dashboard
4. Expected: Data loads instantly from cache
5. After 5-10 seconds, data refreshes

### Phase 7: Security Testing

#### 7.1 Test RLS Policies

**Test customer can only see own data:**
```sql
-- Login as customer in browser
-- Then run this query (should only return your data)
SELECT * FROM purchases;
```

**Test customer cannot see others' data:**
```sql
-- Try to query another customer's purchases
-- Should return empty or error
SELECT * FROM purchases WHERE customer_id != auth.uid();
```

#### 7.2 Test API Authorization

```bash
# Try accessing customer data without auth
curl http://localhost:3000/api/customers
# Expected: 401 Unauthorized

# Try accessing as customer (should get 403)
# Get auth token from browser devtools
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/customers
# Expected: 403 Forbidden (customers can't see all customers)
```

#### 7.3 Test Role-Based Access

1. Login as customer
2. Try to access `/admin`
3. Expected: Redirected to `/auth/staff`

4. Login as staff
5. Try to access `/customer/dashboard`
6. Expected: Redirected to `/admin`

### Phase 8: Stripe Webhooks (Production)

#### 8.1 Test Payment Flow

1. Create a product with payment link
2. Open payment link in browser
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete payment
5. Expected:
   - Webhook fires
   - Purchase record created in database
   - Customer can see purchase in their account

#### 8.2 Test Subscription Flow

1. Create recurring product (monthly membership)
2. Purchase via payment link
3. Expected:
   - Subscription created in Stripe
   - Purchase record created with auto_renew=true
   - next_renewal_date set correctly

4. Simulate renewal:
```bash
stripe trigger invoice.payment_succeeded
```

5. Expected:
   - used_sessions reset to 0
   - purchase_date updated

#### 8.3 Test Refund Flow

1. Create a purchase
2. Refund via Stripe Dashboard
3. Expected:
   - Webhook fires
   - Purchase status updated to 'expired'

### Phase 9: Error Handling Testing

#### 9.1 Test Network Errors

1. Disconnect internet
2. Try to load dashboard
3. Expected: Error message displayed

4. Reconnect
5. Expected: Data loads automatically

#### 9.2 Test Invalid Data

1. Try to create product with negative price
2. Expected: Validation error
3. Try to create pass with invalid dates
4. Expected: Validation error

#### 9.3 Test Database Errors

1. Temporarily break RLS policy (in Supabase)
2. Try to query data
3. Expected: Graceful error handling
4. Restore RLS policy

### Phase 10: Performance Testing

#### 10.1 Test Polling Performance

1. Open browser devtools > Network tab
2. Navigate to dashboard
3. Watch for API calls
4. Expected:
   - Initial load: All data fetched
   - After 5s: Polling starts
   - No excessive requests

#### 10.2 Test with Multiple Users

1. Open 3-5 browser tabs
2. Login as different users in each
3. Create sessions/purchases
4. Verify:
   - No data leakage between users
   - Polling works in all tabs
   - No performance degradation

### Phase 11: Edge Cases

#### 11.1 Test Pass Expiry

1. Create a pass with expiry_date in past
2. Run: `SELECT auto_expire_passes();`
3. Verify status changes to 'expired'

#### 11.2 Test Session Overflow

1. Try to check in when all sessions are used
2. Expected: Error message about no remaining sessions

#### 11.3 Test Auto-Checkout

1. Create session
2. Set auto_checkout_time to 1 minute from now
3. Wait 1 minute
4. Run: `SELECT auto_checkout_sessions();`
5. Verify session ends automatically

## ✅ Testing Completion Checklist

Mark each as you complete:

### Database
- [ ] All tables created successfully
- [ ] RLS policies active and working
- [ ] Triggers functioning correctly
- [ ] Functions execute without errors

### Authentication
- [ ] Admin user created and can login
- [ ] Customer can sign up
- [ ] Customer can sign in
- [ ] Phone login works
- [ ] Role-based access enforced
- [ ] Session persistence works

### Stripe
- [ ] Can create products from platform
- [ ] Can create coupons from platform
- [ ] Payment links generated correctly
- [ ] Webhooks receive events
- [ ] Payments sync to database
- [ ] Subscriptions work correctly

### POS System
- [ ] Phone login/registration works
- [ ] Check-in creates sessions
- [ ] Sessions tracked correctly
- [ ] Admin panel loads data
- [ ] Can view customers
- [ ] Can view sales

### Customer Portal
- [ ] Dashboard displays correctly
- [ ] Can view passes
- [ ] Can view purchase history
- [ ] Can manage children
- [ ] Can update profile
- [ ] Data updates automatically

### API Endpoints
- [ ] All GET endpoints return data
- [ ] All POST endpoints create records
- [ ] All PUT endpoints update records
- [ ] Authentication enforced
- [ ] Authorization enforced

### Data Polling
- [ ] Data refreshes automatically
- [ ] Cache works correctly
- [ ] No excessive requests
- [ ] Real-time updates work

### Security
- [ ] RLS prevents unauthorized access
- [ ] Customers can't see other customers' data
- [ ] API requires authentication
- [ ] Webhook signatures verified
- [ ] Environment variables secured

## 🐛 Common Issues & Solutions

### Issue: "User not found in users table"
**Solution:** User profile wasn't created. Run:
```sql
INSERT INTO users (id, name, phone, email, role)
SELECT id, raw_user_meta_data->>'name', raw_user_meta_data->>'phone', email, 'customer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM users);
```

### Issue: "Unauthorized" on API calls
**Solution:** Check authentication token in browser devtools

### Issue: "Webhook signature verification failed"
**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` in `.env.local`
2. Restart dev server
3. Restart `stripe listen`

### Issue: Data not refreshing
**Solution:**
1. Check SWR is installed: `npm list swr`
2. Check browser console for errors
3. Verify API endpoints return data

### Issue: Can't create Stripe products
**Solution:**
1. Verify `STRIPE_SECRET_KEY` is set
2. Check Stripe Dashboard > Developers > API Keys
3. Ensure using test mode keys for development

## 🎯 Success Criteria

You'll know everything is working when:

1. ✅ Can create admin user and login
2. ✅ Can create customer account
3. ✅ Can create products in Stripe from platform
4. ✅ Can create coupons in Stripe from platform
5. ✅ Webhook events sync to database
6. ✅ Customer can view their data in portal
7. ✅ Data updates automatically via polling
8. ✅ RLS prevents unauthorized access

## 📊 Performance Benchmarks

Expected performance:
- API response time: < 500ms
- Page load time: < 2s
- Webhook processing: < 1s
- Data polling interval: 5-10s
- Cache hit rate: > 80%

## 🚀 Ready for Production?

Before deploying, ensure:
- [ ] All tests pass
- [ ] No console errors
- [ ] No lint errors
- [ ] Environment variables documented
- [ ] Stripe test mode works perfectly
- [ ] Database backups configured
- [ ] Error monitoring set up

---

**Need help debugging? Check server logs and Supabase dashboard logs.**

