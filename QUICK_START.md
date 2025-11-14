# Quick Start Guide - Get Running in 10 Minutes

## ✅ Prerequisites (Already Done!)
- ✅ Supabase project created
- ✅ SQL migrations run
- ✅ `.env.local` configured
- ✅ Dependencies installed

## 🚀 Get Started Now

### Step 1: Create Your Admin User (2 minutes)

1. Open Supabase Dashboard → **Authentication > Users**
2. Click "**Add user**"
3. Enter:
   - Email: `admin@busybees.com` (or your email)
   - Password: (create a secure password)
4. Click "**Add user**"

5. Go to **Table Editor > users**
6. Find the user you created
7. Change `role` from `customer` to `admin`
8. Click "**Save**"

### Step 2: Start Development Server (30 seconds)

```bash
npm run dev
```

Visit: http://localhost:3000

### Step 3: Test Admin Login (1 minute)

1. Visit: http://localhost:3000/pos-v2
2. Click "**Staff / Admin Access**"
3. Enter your admin credentials
4. You should see the admin dashboard!

### Step 4: Create Your First Stripe Product (2 minutes)

1. In the admin panel, find **Stripe Product Manager**
2. Click "**Create Stripe Product**"
3. Fill in:
   - **Name:** "Day Pass - Toddler"
   - **Description:** "Full day of play"
   - **Type:** Pass
   - **Category:** Day
   - **Price:** 17.00
4. Click "**Create in Stripe**"

5. **Verify it worked:**
   - Check [Stripe Dashboard](https://dashboard.stripe.com/test/products)
   - You should see "Day Pass - Toddler" listed!
   - Check Supabase Table Editor > passes
   - You should see the pass there too!

### Step 5: Create a Promotional Coupon (2 minutes)

1. Find **Stripe Coupon Manager**
2. Click "**Create Coupon**"
3. Fill in:
   - **Coupon Code:** TEST25
   - **Discount Percent:** 25
   - **Duration:** Once
   - **Enable "Create promo banner"** ✅
   - **Promo Name:** "Test Promotion"
   - **Start/End Dates:** Today → Next week
   - **Description:** "Amazing test deal!"
4. Click "**Create Coupon**"

5. **Verify it worked:**
   - Check [Stripe Dashboard](https://dashboard.stripe.com/test/coupons)
   - You should see "TEST25"!
   - Visit http://localhost:3000
   - You should see the promo banner!

### Step 6: Test Customer Portal (2 minutes)

1. In another browser (or incognito), visit http://localhost:3000/pos-v2
2. Enter phone: **(555) 123-4567**
3. Fill in name: "Test Customer"
4. Email: test@example.com
5. Click "**Create Account**"

6. Visit: http://localhost:3000/customer/dashboard
7. Explore:
   - Dashboard shows your stats
   - Click "My Children" → Add a child
   - Click "My Passes" → See your passes
   - Click "Account Settings" → Update profile

### Step 7: Test Stripe Webhook (Optional - 3 minutes)

```bash
# Terminal 1: Already running
npm run dev

# Terminal 2: Start Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Trigger test payment
stripe trigger payment_intent.succeeded
```

Check your dev server logs - should see:
```
✅ Purchase record created successfully
```

## 🎉 You're Done!

You now have a fully-functional system!

## 🎯 What You Can Do Now

### Create Real Products
1. Login as admin
2. Use Stripe Product Manager
3. Create day passes, memberships, party packages
4. They'll appear on your website instantly

### Launch Promotions
1. Use Stripe Coupon Manager
2. Create limited-time offers
3. Promo banners auto-appear on homepage
4. Customers can use codes at checkout

### Manage Customers
1. View all customer data in admin panel
2. Track purchases and sessions
3. Monitor revenue in real-time
4. Force check-out if needed

### Customer Self-Service
1. Customers can sign up themselves
2. View their passes and history
3. Manage their children
4. Track their usage

## 📱 Test on Mobile

The system is fully responsive:
- Visit http://localhost:3000/pos-v2 on your phone
- Test customer signup
- Test check-in flow
- Everything should work perfectly!

## 🚀 Deploy to Production

When ready:
1. Read `DEPLOYMENT_GUIDE.md`
2. Deploy to Vercel (5 minutes)
3. Configure production Stripe webhook
4. You're live! 🎊

## 🆘 Quick Troubleshooting

**Can't login?**
- Check `.env.local` has correct Supabase keys
- Verify user was created in Supabase dashboard
- Check user role is set correctly

**Stripe product creation fails?**
- Check `.env.local` has Stripe secret key
- Verify you're using test mode keys
- Check Stripe dashboard for errors

**Customer portal shows loading forever?**
- Check browser console for errors
- Verify Supabase URL is correct
- Check network tab for failed requests

## 💝 What You've Achieved

In less than a day, you've gone from a localStorage-based app to an **enterprise-grade platform** with:

- Secure database backend
- Full authentication
- Complete Stripe integration
- Customer self-service portal
- Staff/admin tools
- Real-time data updates
- Production-ready architecture

**This is HUGE!** 🎉

## 📖 Next Reading

- `TESTING_GUIDE.md` - Comprehensive testing procedures
- `DEPLOYMENT_GUIDE.md` - Deploy to production
- `SUPABASE_SETUP_GUIDE.md` - Deep dive into setup

---

**Happy Building! 🐝**

