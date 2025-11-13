
# Production Deployment Guide

## 🚀 Deploying to Vercel

### Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migrations completed in Supabase
- [ ] Admin user created
- [ ] Stripe test mode working
- [ ] No console errors
- [ ] Code committed to Git

### Step 1: Prepare Repository

```bash
# Ensure all code is committed
git add .
git commit -m "feat: Complete Supabase integration with Stripe"
git push origin main
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the repository: `BusyBees`
5. Framework Preset: Next.js (auto-detected)
6. Root Directory: `./` (default)

### Step 3: Configure Environment Variables

In Vercel dashboard, add all environment variables:

**Supabase Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Stripe Variables:**
```
STRIPE_SECRET_KEY=sk_live_your-production-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-production-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret (add after webhook setup)
```

**Site Configuration:**
```
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

⚠️ **Important:** Use PRODUCTION Stripe keys, not test keys!

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-5 minutes)
3. Once deployed, get your production URL (e.g., `https://busybees.vercel.app`)

### Step 5: Configure Stripe Production Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Switch to **Live Mode** (toggle in top right)
3. Navigate to **Developers > Webhooks**
4. Click "Add endpoint"
5. Enter endpoint URL:
   ```
   https://your-domain.vercel.app/api/stripe/webhook
   ```
6. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `charge.refunded`
7. Click "Add endpoint"
8. Copy the **Signing secret** (starts with `whsec_`)

### Step 6: Add Webhook Secret to Vercel

1. Go back to Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add new variable:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_xxxxx` (from Stripe)
4. Click "Save"
5. **Redeploy** the application (Settings > Deployments > ... > Redeploy)

### Step 7: Verify Production Deployment

#### Test 1: Health Check
Visit your production URL: `https://your-domain.vercel.app`
- Should load without errors
- Check browser console for errors

#### Test 2: API Endpoints
```bash
curl https://your-domain.vercel.app/api/passes
```
Should return JSON data

#### Test 3: Authentication
1. Try to login with admin credentials
2. Verify redirects work correctly
3. Test customer signup

#### Test 4: Stripe Webhook
1. Make a real test purchase using Stripe test mode first
2. Then switch to live mode
3. Check Stripe Dashboard > Webhooks > Events
4. Verify webhook events are being received
5. Check Supabase database for new records

### Step 8: Configure Custom Domain (Optional)

1. Purchase domain (e.g., from Namecheap, GoDaddy)
2. In Vercel, go to Settings > Domains
3. Add your custom domain
4. Follow DNS configuration instructions
5. Wait for SSL certificate to provision (~24 hours)
6. Update `NEXT_PUBLIC_SITE_URL` to your custom domain
7. Update Stripe webhook URL to use custom domain

### Step 9: Set Up Monitoring

#### Vercel Monitoring
1. Go to Analytics tab in Vercel
2. Enable Web Vitals monitoring
3. Set up alerts for errors

#### Supabase Monitoring
1. Go to Supabase Dashboard > Logs
2. Review database logs
3. Set up alerts for errors

#### Stripe Monitoring
1. Set up email notifications for failed payments
2. Monitor webhook event logs
3. Set up Stripe Radar for fraud detection

### Step 10: Create Production Admin User

**IMPORTANT:** Create a secure admin account for production

```sql
-- After creating auth user in Supabase dashboard
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-production-admin@busybees.com';
```

## 🔒 Security Hardening

### 1. Review RLS Policies
- [ ] All tables have RLS enabled
- [ ] Policies tested and working
- [ ] No data leakage between users

### 2. Secure Environment Variables
- [ ] All secrets in Vercel environment variables
- [ ] No secrets in code
- [ ] `.env.local` in `.gitignore`
- [ ] Separate test and production keys

### 3. API Security
- [ ] All endpoints require authentication
- [ ] Role-based authorization working
- [ ] Webhook signatures verified
- [ ] Rate limiting considered (future enhancement)

### 4. Database Security
- [ ] Service role key only used server-side
- [ ] Anon key safe for client-side
- [ ] Database backups enabled in Supabase
- [ ] SSL connections enforced

## 📊 Post-Deployment Checklist

After deployment, verify:

- [ ] Homepage loads correctly
- [ ] POS system accessible
- [ ] Admin can login
- [ ] Customers can signup/login
- [ ] Stripe products can be created
- [ ] Stripe coupons can be created
- [ ] Payments process correctly
- [ ] Webhooks firing successfully
- [ ] Customer portal functional
- [ ] Data polling working
- [ ] No console errors
- [ ] SSL certificate active
- [ ] Custom domain working (if applicable)

## 🔄 Continuous Deployment

### Auto-Deploy on Git Push

Vercel automatically deploys when you push to main:

```bash
git add .
git commit -m "feat: Add new feature"
git push origin main
```

Deployment automatically triggers.

### Environment-Specific Configuration

**Development:**
- Use test Stripe keys
- Use development Supabase project
- Test webhooks with Stripe CLI

**Production:**
- Use live Stripe keys
- Use production Supabase project
- Real webhook endpoint

## 🆘 Troubleshooting Production Issues

### Issue: 500 Errors
**Check:**
1. Vercel function logs (Functions tab)
2. Environment variables are all set
3. Supabase connection working

### Issue: Webhooks Not Working
**Check:**
1. Webhook URL is correct
2. Webhook secret matches Vercel env var
3. Stripe dashboard shows webhook events
4. Check Vercel function logs

### Issue: Authentication Failing
**Check:**
1. Supabase URL and keys are correct
2. Middleware is working
3. Cookies are being set correctly
4. Check browser devtools > Application > Cookies

### Issue: Database Queries Failing
**Check:**
1. RLS policies allow the operation
2. User has correct role
3. Supabase logs for errors
4. Connection limits not exceeded

## 📈 Scaling Considerations

### Database
- Monitor query performance in Supabase
- Add indexes for slow queries
- Consider connection pooling for high traffic
- Enable point-in-time recovery

### API
- Consider implementing rate limiting
- Cache frequently accessed data
- Use database functions for complex queries
- Monitor Vercel function execution times

### Costs
- **Supabase Free Tier:**
  - 500MB database
  - 2GB bandwidth
  - 50,000 monthly active users
  
- **Vercel Free Tier:**
  - 100GB bandwidth
  - Unlimited deployments
  - Serverless functions

### When to Upgrade
- Database > 400MB → Upgrade Supabase
- > 1M monthly page views → Upgrade Vercel
- Need more function execution time
- Need dedicated support

## 🎉 Launch Checklist

Before announcing to customers:

- [ ] All features tested in production
- [ ] Payment flow tested with real card
- [ ] Refund flow tested
- [ ] Customer portal fully functional
- [ ] Admin panel fully functional
- [ ] Error monitoring active
- [ ] Backup strategy in place
- [ ] Support email configured
- [ ] Terms of service updated
- [ ] Privacy policy updated

## 📞 Support Resources

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support  
- **Stripe Support:** https://support.stripe.com

## 🎊 Congratulations!

You've deployed a fully-functional, enterprise-grade system with:
- 🔐 Secure authentication
- 💾 Robust database
- 💳 Complete Stripe integration
- 📊 Real-time data polling
- 🎯 Role-based access control
- 🚀 Scalable architecture

---

**Your Busy Bees platform is live! 🐝**

