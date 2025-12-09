# Stripe Payment Persistence - Testing Guide

## Overview

This guide provides step-by-step instructions to verify that POS purchases (passes, parties, and snacks) now correctly persist through logout/login cycles and create real Stripe transactions.

---

## Prerequisites

Before testing, ensure:

1. ✅ Stripe is configured in test mode
2. ✅ Stripe API keys are set in settings (`/admin/settings`)
3. ✅ Database is running (Supabase)
4. ✅ Development server is running (`npm run dev`)
5. ✅ You have access to:
   - Application at `http://localhost:3000`
   - Stripe Dashboard (test mode)
   - Supabase Dashboard (Table Editor)

---

## Test 1: Pass Purchase Persistence

### Steps:

1. **Login as Staff**
   - Navigate to `/pos`
   - Enter staff PIN to access POS

2. **Select or Create Customer**
   - Search for existing customer by phone
   - OR create new customer with phone + PIN

3. **Add Child with Waiver**
   - Go to customer's profile
   - Add child: name, birthdate
   - Sign waiver for the child

4. **Purchase Pass**
   - Navigate to "Passes & Memberships" tab
   - Select a pass (e.g., "Day Pass")
   - Choose the child for this pass
   - Click "Purchase"
   - Wait for success message

5. **Verify Immediately**
   - ✅ Pass should appear in customer's purchase list
   - ✅ Expiry date should be calculated
   - ✅ Status should be "active"
   - ✅ Sessions should show 0 used

6. **Test Persistence - Logout**
   - Click "Logout" button
   - Return to login screen

7. **Test Persistence - Login Again**
   - Enter same customer's phone + PIN
   - Login to POS

8. **Verify Purchase Persists**
   - ✅ Pass should still be in purchase list
   - ✅ All details should match (name, price, expiry)
   - ✅ Pass should be usable for check-in

### Expected Database Record:

```sql
SELECT * FROM purchases
WHERE customer_id = 'xxx'
AND type LIKE '%pass'
ORDER BY purchase_date DESC
LIMIT 1;
```

Should show:
- ✅ `stripe_payment_intent_id` is populated
- ✅ `status` = 'active'
- ✅ `child_id` matches selected child
- ✅ `expiry_date` is set correctly

### Expected Stripe Transaction:

**Dashboard → Payments:**
- ✅ New PaymentIntent created
- ✅ Amount matches pass price
- ✅ Status = 'succeeded'
- ✅ Customer name matches

**Metadata should include:**
- `customer_id`
- `product_id`
- `purchase_type` = 'day_pass' (or weekly/monthly)
- `child_id`
- `product_name`
- `pos_transaction` = 'true'

---

## Test 2: Party Package Persistence

### Steps:

1. **Login as Customer** (or staff on behalf of customer)
   - Navigate to `/pos` or `/customer/book-party`
   - Login with phone + PIN

2. **Purchase Party Package**
   - Navigate to "Parties & Events" tab
   - Select a party package
   - Click "Purchase"
   - Success message appears

3. **Logout and Login**
   - Logout from POS
   - Login again with same credentials

4. **Verify Party Persists**
   - ✅ Party package should be in purchases
   - ✅ All details should be intact
   - ✅ Status should be 'active'

### Expected Database Record:

```sql
SELECT * FROM purchases
WHERE customer_id = 'xxx'
AND type = 'party_package'
ORDER BY purchase_date DESC
LIMIT 1;
```

Should show:
- ✅ `stripe_payment_intent_id` is populated
- ✅ `party_date`, `party_start_time`, `party_guests` are saved (if provided)
- ✅ `status` = 'active'
- ✅ `expiry_date` is 30 days from purchase

### Expected Stripe Transaction:

**Dashboard → Payments:**
- ✅ PaymentIntent with party package amount
- ✅ Status = 'succeeded'

**Metadata includes:**
- `purchase_type` = 'party_package'
- `party_date`, `party_time`, `party_guests`, `party_notes` (if provided)

---

## Test 3: Snack Purchase Persistence

### Steps:

1. **Login as Staff**
   - Access POS at `/pos`

2. **Select Customer**
   - Search and select customer

3. **Purchase Snacks**
   - Navigate to "Snacks & Drinks" tab
   - Add snacks to cart (e.g., Water Bottle, Chips)
   - Adjust quantities
   - Click "Purchase"

4. **Verify Immediately**
   - ✅ Snacks appear in "Recent Snack Purchases"
   - ✅ Status is "used" (consumed immediately)

5. **Logout and Login**
   - Logout customer
   - Login again with same phone + PIN

6. **Verify Snack History**
   - ✅ Snack purchases should appear in history
   - ✅ All details should be preserved
   - ✅ Status should remain "used"

### Expected Database Record:

```sql
SELECT * FROM purchases
WHERE customer_id = 'xxx'
AND type = 'food_beverage'
ORDER BY purchase_date DESC
LIMIT 5;
```

Should show:
- ✅ `stripe_payment_intent_id` for each snack
- ✅ `status` = 'used'
- ✅ `total_sessions` = 1
- ✅ No expiry date (food doesn't expire in system)

### Expected Stripe Transaction:

**Dashboard → Payments:**
- ✅ PaymentIntent for snack purchase amount
- ✅ Status = 'succeeded'

**Metadata:**
- `purchase_type` = 'food_beverage'
- `product_name` = snack name

---

## Test 4: Multiple Purchases in One Session

### Steps:

1. **Login as Staff**

2. **Purchase Multiple Items:**
   - Buy Day Pass for Child A
   - Buy Party Package
   - Buy Snack (Water Bottle)

3. **Verify All Three Immediately**
   - ✅ All three should appear in respective sections
   - ✅ Each should have correct type and status

4. **Logout and Login**

5. **Verify All Persist**
   - ✅ Day Pass is in passes list
   - ✅ Party Package is in parties list
   - ✅ Snack is in snack history

### Expected Results:

- ✅ 3 separate purchases in database
- ✅ 3 separate PaymentIntents in Stripe
- ✅ All persist through logout/login
- ✅ Each has correct type and metadata

---

## Test 5: Cross-Device Persistence

### Steps:

1. **Device 1 - Desktop:**
   - Login as customer
   - Purchase pass

2. **Device 2 - Mobile/Tablet:**
   - Login as same customer
   - ✅ Pass should appear immediately
   - (May need to refresh if no real-time sync)

3. **Verify:**
   - ✅ Purchase made on one device is visible on another
   - ✅ Data comes from database, not local storage

---

## Verification Checklist

### ✅ Database Verification

Use Supabase Table Editor or SQL:

```sql
-- Check all purchases for a customer
SELECT
  id,
  name,
  type,
  price,
  status,
  stripe_payment_intent_id,
  purchase_date,
  expiry_date
FROM purchases
WHERE customer_id = 'CUSTOMER_UUID'
ORDER BY purchase_date DESC;
```

**What to verify:**
- ✅ All purchases have `stripe_payment_intent_id`
- ✅ Purchase types are correct
- ✅ Expiry dates calculated correctly
- ✅ Statuses are appropriate (active for passes/parties, used for snacks)

### ✅ Stripe Dashboard Verification

Navigate to: https://dashboard.stripe.com/test/payments

**What to verify:**
- ✅ See all test payments created
- ✅ Each payment shows "Succeeded"
- ✅ Amounts match purchase prices
- ✅ Customer names match
- ✅ Descriptions match product names

**Check Payment Details:**
- Click on any payment
- Scroll to "Metadata" section
- ✅ `customer_id` is present
- ✅ `purchase_type` matches
- ✅ `product_id` and `product_name` are correct
- ✅ `pos_transaction` = 'true'

### ✅ Webhook Verification

Check webhook logs:

```sql
-- In Supabase, check if webhooks are processing
SELECT * FROM purchases
WHERE stripe_payment_intent_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

If webhook is configured:
- ✅ Purchases created by POS API
- ✅ Webhook confirms payment status
- ✅ No duplicate purchases

---

## Common Issues & Troubleshooting

### Issue: Purchase succeeds but disappears on logout

**Cause:** API not being called, still using local state

**Fix:**
- Check browser console for errors
- Verify `/api/purchases/pos` endpoint returns 201
- Check network tab for actual API call

### Issue: Stripe error "No such payment method"

**Cause:** Test payment method not working

**Fix:**
- Ensure using test mode in Stripe
- Use test card: `pm_card_visa`
- Check Stripe keys are test keys (start with `sk_test_`)

### Issue: Purchase created but no Stripe transaction

**Cause:** Stripe API call failing silently

**Fix:**
- Check server logs for Stripe errors
- Verify Stripe keys in `/admin/settings`
- Check Stripe Dashboard webhooks section

### Issue: "Forbidden - Staff only" error

**Cause:** User doesn't have staff/admin role

**Fix:**
```sql
-- Update user role in Supabase
UPDATE users
SET role = 'staff'
WHERE id = 'USER_UUID';
```

---

## Performance Testing

### Test Load Times:

1. **Login with 100 purchases:**
   - Should load in < 2 seconds
   - Pagination should work

2. **Purchase processing time:**
   - Should complete in < 3 seconds
   - Includes Stripe API call + DB write

3. **Multiple simultaneous purchases:**
   - Should handle concurrent staff purchases
   - No race conditions or duplicates

---

## Success Criteria Summary

All tests pass when:

✅ **Persistence:**
- All purchases persist through logout/login
- Data comes from database, not browser memory
- Works across devices

✅ **Stripe Integration:**
- All purchases create PaymentIntents in Stripe
- Amounts and metadata are correct
- Test mode works flawlessly

✅ **Database Records:**
- All purchases saved to `purchases` table
- Relationships preserved (customer, child)
- Expiry dates calculated correctly

✅ **User Experience:**
- No disruption to UI flow
- Clear success/error messages
- Fast response times (< 3 seconds)

---

## Rollback Instructions

If issues are found:

1. **Quick Fix:** Revert component files:
   ```bash
   git checkout HEAD~1 -- src/components/pos/CustomerDashboard.tsx
   git checkout HEAD~1 -- src/components/pos/CheckIn.tsx
   git checkout HEAD~1 -- src/components/pos/PhoneLogin.tsx
   ```

2. **Database:** Purchases already created will remain (safe)

3. **Stripe:** Payments already processed cannot be undone (refund if needed)

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Deploy to staging environment
2. ✅ Test with real staff members
3. ✅ Monitor error logs for 24 hours
4. ✅ Switch Stripe from test mode to live mode
5. ✅ Deploy to production

---

## Support & Debugging

### Useful Commands:

```bash
# Check API endpoint
curl -X POST http://localhost:3000/api/purchases/pos \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"xxx","product_id":"xxx",...}'

# Monitor server logs
npm run dev | grep -i "purchase\|stripe"

# Check database
psql -d busybees -c "SELECT * FROM purchases ORDER BY created_at DESC LIMIT 5;"
```

### Helpful Links:

- Stripe Test Cards: https://stripe.com/docs/testing
- Supabase Dashboard: https://app.supabase.com
- Stripe Dashboard: https://dashboard.stripe.com/test

---

**Testing completed on:** _____________

**Tested by:** _____________

**All tests passed:** ☐ Yes ☐ No

**Issues found:** _____________

**Notes:** _____________

