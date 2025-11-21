# 🚀 Quick Start - Test the Fix in 5 Minutes

## The 5-Minute Test

This will prove the fix works:

### Step 1: Start the App (30 seconds)
```bash
npm run dev
```

### Step 2: Login (30 seconds)
1. Go to `http://localhost:3000/pos`
2. Enter a test phone number (last 4 digits)
3. Enter PIN

**OR** create new customer if needed.

### Step 3: Purchase Something (1 minute)
1. Navigate to "Passes & Memberships" tab
2. Click "Purchase Day Pass"
3. Select a child (add one if needed with waiver)
4. Click "Confirm Purchase"
5. Wait for success message ✅

### Step 4: THE CRITICAL TEST (2 minutes)
1. **Click "Logout"**
2. You're back at login screen
3. **Enter the SAME phone number and PIN**
4. **Look at the customer's purchases**

### ✅ Success = The pass is still there!

---

## What Should Happen

### ✅ Before Logout:
- Purchase appears in list
- Shows name, price, expiry date
- Status = "active"

### ✅ After Logout:
- Returns to login screen
- No errors

### ✅ After Login:
**THE PURCHASE IS STILL THERE** ← This proves it works!

---

## Quick Verification

### Check Stripe (30 seconds):
1. Go to: https://dashboard.stripe.com/test/payments
2. You should see a new payment
3. Amount matches the purchase price
4. Status = "Succeeded"

### Check Database (30 seconds):
```sql
SELECT name, price, status, stripe_payment_intent_id
FROM purchases
ORDER BY purchase_date DESC
LIMIT 5;
```

Should show your purchase with a `stripe_payment_intent_id` value.

---

## 🎯 That's It!

If the purchase survives logout/login, **the fix works perfectly!**

For detailed testing of all scenarios (parties, snacks, multiple purchases), see:
- `STRIPE_PAYMENT_TESTING_GUIDE.md`

For technical details, see:
- `STRIPE_PAYMENT_FIX_SUMMARY.md`

---

## ❌ If It Doesn't Work

### Check 1: Is the dev server running?
```bash
npm run dev
# Should see: Ready on http://localhost:3000
```

### Check 2: Any console errors?
- Open browser Developer Tools (F12)
- Check Console tab for red errors
- Check Network tab for failed API calls

### Check 3: Is Stripe configured?
- Go to `/admin/settings`
- Verify Stripe keys are set
- Keys should start with `sk_test_` for test mode

### Check 4: Database connection?
- Verify Supabase is running
- Check environment variables

---

## 🐛 Common Issues

**"Forbidden - Staff only"**
→ Your user needs staff role:
```sql
UPDATE users SET role = 'staff' WHERE phone = 'YOUR_PHONE';
```

**"No such payment method"**
→ Stripe keys might be wrong. Check `/admin/settings`

**Purchase appears then disappears**
→ Check browser console for errors
→ Check if API call succeeded (Network tab)

---

## ✨ Next Steps After Testing

1. ✅ Test passes work
2. ✅ Test parties work
3. ✅ Test snacks work
4. ✅ Verify Stripe transactions
5. ✅ Deploy to production

---

**Ready? Let's test it!** 🚀

```bash
npm run dev
```

Then follow the 5-minute test above.

