# 🐝 Busy Bees Pre-Launch QA Checklist

**Launch Date Target:** Next Week **Testing Environment:** Production/Staging with
Stripe Test Mode **Last Updated:** December 28, 2025

---

## 📋 How to Use This Document

1. Work through each section systematically
2. Check off items as you complete them ✅
3. Note any issues in the "Issues Found" section at the bottom
4. Use Stripe test cards (listed below) for all payment testing

---

## 🧪 Stripe Test Cards Reference

Use these test cards in Stripe test mode:

| Card Type              | Number                | Exp             | CVC          |
| ---------------------- | --------------------- | --------------- | ------------ |
| ✅ Visa (Success)      | `4242 4242 4242 4242` | Any future date | Any 3 digits |
| ✅ Mastercard          | `5555 5555 5555 4444` | Any future date | Any 3 digits |
| ✅ American Express    | `3782 822463 10005`   | Any future date | Any 4 digits |
| ❌ Declined            | `4000 0000 0000 0002` | Any future date | Any 3 digits |
| ❌ Insufficient Funds  | `4000 0000 0000 9995` | Any future date | Any 3 digits |
| ⚠️ Requires Auth (3DS) | `4000 0025 0000 3155` | Any future date | Any 3 digits |

**Test Postal Code:** `12345` (or any 5 digits)

---

## 1️⃣ POS System - Customer Login & Registration

### 1.1 New Customer Registration

- [ ] Navigate to POS page (`/pos`)
- [ ] Enter a new phone number (10 digits, use test: `555-TEST-001`)
- [ ] Verify system shows "New Customer" signup form
- [ ] Fill in customer name
- [ ] Fill in customer email
- [ ] Submit and verify account creation
- [ ] Verify customer appears in database (Supabase `users` table)
- [ ] Verify customer is created in Stripe (check Stripe Dashboard > Customers)
- [ ] Verify welcome email is sent (check email inbox or Resend logs)

**Test Data:**

```
Phone: (555) 555-1001
Name: Test Parent One
Email: testparent1@busybees.test
```

### 1.2 Existing Customer Login

- [ ] Return to POS login screen
- [ ] Enter existing customer's phone number
- [ ] Verify customer data loads correctly
- [ ] Verify children list displays (if any)
- [ ] Verify purchase history displays
- [ ] Verify saved payment methods display
- [ ] Verify `last_visit` updates in database

### 1.3 Admin/Staff Access

- [ ] Click the bee logo on login screen
- [ ] Enter PIN: `1234`
- [ ] Verify admin dashboard loads
- [ ] Test toggling staff mode on/off
- [ ] Verify staff mode header indicator shows

---

## 2️⃣ POS System - Children Management

### 2.1 Add New Child

- [ ] Login as a customer in POS
- [ ] Navigate to "My Account" or check-in screen
- [ ] Find "Add Child" functionality
- [ ] Enter child name
- [ ] Enter child birthdate
- [ ] Submit and verify child is added to customer account
- [ ] Verify child appears in database (`children` table)
- [ ] Verify age is calculated correctly

**Test Data:**

```
Child Name: Little Bee One
Birthdate: 2022-03-15 (Toddler - ~2.5 years old)

Child Name: Baby Bee Two
Birthdate: 2024-06-01 (Infant - ~6 months old)
```

### 2.2 Edit Child Information

- [ ] Select an existing child
- [ ] Edit child name
- [ ] Edit birthdate
- [ ] Save changes
- [ ] Verify changes reflect in UI
- [ ] Verify changes saved to database

### 2.3 Sign Waiver for Child

- [ ] Find waiver signing functionality
- [ ] Sign waiver for a child
- [ ] Verify `waiver_signed` becomes `true` in database
- [ ] Verify `waiver_signed_date` is recorded
- [ ] Verify UI shows waiver status

---

## 3️⃣ POS System - Pass Purchasing

### 3.1 Day Pass Purchase (Toddler)

- [ ] Login as customer in POS
- [ ] Navigate to purchase/check-in area
- [ ] Select "Day Pass - Toddler (2+)" ($17.00)
- [ ] Assign to a child (toddler)
- [ ] Complete purchase with test card `4242 4242 4242 4242`
- [ ] Verify payment succeeds
- [ ] Verify purchase appears in customer's purchases
- [ ] Verify purchase record in database (`purchases` table)
- [ ] Verify Stripe payment intent is created
- [ ] Verify pass status is "active"

### 3.2 Day Pass Purchase (Infant)

- [ ] Select "Day Pass - Infant" ($7.00)
- [ ] Assign to infant child
- [ ] Complete purchase
- [ ] Verify all data syncs correctly

### 3.3 Monthly Membership Purchase

- [ ] Select "Monthly Membership - Toddler" ($100.00)
- [ ] Complete purchase
- [ ] Verify subscription or recurring purchase setup
- [ ] Verify 30-day expiry date is set
- [ ] Verify `total_sessions` = 999 (unlimited)

### 3.4 Punch Card Purchase

- [ ] Select "Punch Card (10 passes) - Toddler" ($150.00)
- [ ] Complete purchase
- [ ] Verify `total_sessions` = 10
- [ ] Verify 90-day expiry from first use

### 3.5 Declined Payment Handling

- [ ] Attempt purchase with declined card `4000 0000 0000 0002`
- [ ] Verify error message displays appropriately
- [ ] Verify no purchase record is created
- [ ] Verify customer can retry with valid card

---

## 4️⃣ POS System - Check-In/Check-Out

### 4.1 Check-In with Active Pass

- [ ] Ensure customer has an active pass
- [ ] Navigate to check-in screen
- [ ] Select child to check in
- [ ] Confirm check-in
- [ ] Verify session is created in database (`sessions` table)
- [ ] Verify `start_time` is recorded
- [ ] Verify `auto_checkout_time` is set (8 hours from start)
- [ ] Verify pass `used_sessions` increments

### 4.2 Check-In Status Display

- [ ] Verify checked-in children display on screen
- [ ] Verify session timer/duration shows
- [ ] Verify auto-checkout countdown visible

### 4.3 Manual Check-Out

- [ ] Select active session
- [ ] Click check-out
- [ ] Verify session `end_time` is recorded
- [ ] Verify session `duration` is calculated
- [ ] Verify session no longer shows as active

### 4.4 Check-In Without Active Pass

- [ ] Attempt check-in for child without valid pass
- [ ] Verify system prompts to purchase pass
- [ ] Verify no session is created without valid pass

### 4.5 Expired Pass Handling

- [ ] Test with an expired pass (manually update expiry_date in DB to past date)
- [ ] Attempt check-in
- [ ] Verify system shows pass is expired
- [ ] Verify prompt to purchase new pass

---

## 5️⃣ POS System - Payment Methods

### 5.1 Add Payment Method

- [ ] Login as customer
- [ ] Click payment dropdown in header
- [ ] Select "Add New Payment Method"
- [ ] Enter test card details
- [ ] Save card
- [ ] Verify card appears in saved cards list
- [ ] Verify card saved to database (`saved_cards` table)
- [ ] Verify card attached to Stripe customer

### 5.2 Set Default Payment Method

- [ ] Add second payment method
- [ ] Set as default
- [ ] Verify default indicator shows correctly
- [ ] Verify database `is_default` flag updates

### 5.3 Remove Payment Method

- [ ] Remove a non-default card
- [ ] Verify card is removed from list
- [ ] Verify removed from database
- [ ] Verify detached from Stripe customer

---

## 6️⃣ POS System - Inactivity & Session Timeout

### 6.1 Inactivity Warning

- [ ] Login as customer
- [ ] Wait 30 seconds without activity
- [ ] Verify warning modal appears
- [ ] Verify countdown timer shows 30 seconds
- [ ] Click "Resume Session"
- [ ] Verify session continues
- [ ] Verify timer resets

### 6.2 Auto-Logout

- [ ] Login as customer
- [ ] Wait for inactivity warning
- [ ] Do NOT click anything
- [ ] Wait for countdown to reach 0
- [ ] Verify auto-logout occurs
- [ ] Verify return to login screen

---

## 7️⃣ Web Customer Portal

### 7.1 Customer Signup (Web)

- [ ] Navigate to `/customer/signup`
- [ ] Enter name, email, phone
- [ ] Create password
- [ ] Submit signup
- [ ] Verify account created in database
- [ ] Verify email verification sent
- [ ] Verify redirect to dashboard

**Test Data:**

```
Name: Web Test Customer
Email: webtest@busybees.test
Phone: (555) 555-2001
Password: TestPassword123!
```

### 7.2 Customer Login (Web)

- [ ] Navigate to `/customer/login`
- [ ] Login with email and password
- [ ] Verify successful login
- [ ] Verify dashboard loads with correct data

### 7.3 Password Reset

- [ ] Click "Forgot Password"
- [ ] Enter email address
- [ ] Verify reset email sent
- [ ] Follow reset link
- [ ] Set new password
- [ ] Verify can login with new password

### 7.4 Customer Dashboard

- [ ] Verify dashboard shows customer info
- [ ] Verify active passes display
- [ ] Verify children list shows
- [ ] Verify purchase history accessible
- [ ] Verify party bookings show

### 7.5 Manage Children (Web)

- [ ] Navigate to Children section
- [ ] Add new child
- [ ] Edit existing child
- [ ] Verify sync with database

---

## 8️⃣ Web Pass Purchasing

### 8.1 Browse Passes on Homepage

- [ ] Navigate to homepage
- [ ] Verify pricing section displays all passes
- [ ] Verify prices are correct
- [ ] Click "Buy Now" on a pass

### 8.2 Purchase Flow (Not Logged In)

- [ ] Click "Buy Now" on Day Pass
- [ ] Verify redirect to signup/login
- [ ] Verify purchase intent saved to sessionStorage
- [ ] Complete login/signup
- [ ] Verify redirect to checkout
- [ ] Verify Stripe Checkout page loads
- [ ] Complete purchase with test card
- [ ] Verify success page shows
- [ ] Verify purchase in database
- [ ] Verify purchase in customer account

### 8.3 Purchase Flow (Already Logged In)

- [ ] Login to customer portal
- [ ] Navigate to pricing page
- [ ] Select a pass
- [ ] Verify direct redirect to Stripe Checkout
- [ ] Complete purchase
- [ ] Verify success

---

## 9️⃣ Party Booking System

### 9.1 Party Booking Wizard

- [ ] Navigate to `/parties`
- [ ] Click "Book Now"
- [ ] Verify booking wizard opens

**Step 1 - Contact Info:**

- [ ] Enter customer name
- [ ] Enter email
- [ ] Enter phone
- [ ] Enter address (optional)
- [ ] Verify validation works
- [ ] Click Next

**Step 2 - Party Type:**

- [ ] Select Private or Semi-Private
- [ ] Verify pricing updates based on selection
- [ ] Click Next

**Step 3 - Package Selection:**

- [ ] View all packages (Queen Bee, Worker Bee, Basic Bee)
- [ ] Select a package
- [ ] Verify price displays correctly
- [ ] Click Next

**Step 4 - Date & Time:**

- [ ] View calendar
- [ ] Select available date
- [ ] Select available time slot
- [ ] Verify unavailable slots are blocked
- [ ] Click Next

**Step 5 - Guest Info:**

- [ ] Enter child name
- [ ] Enter child age
- [ ] Enter guest count
- [ ] Adjust if over 15 (verify additional kid pricing)
- [ ] Add any notes
- [ ] Click Next

**Step 6 - Review & Payment:**

- [ ] Verify all details correct
- [ ] Verify total price calculation
- [ ] Click "Proceed to Payment"
- [ ] Complete Stripe Checkout
- [ ] Verify success page displays

**Test Data:**

```
Customer Name: Party Parent Test
Email: partytest@busybees.test
Phone: (555) 555-3001
Address: 123 Party Lane

Party Type: Private
Package: Worker Bee ($525)
Date: [Select next available Saturday]
Time: 2:00 PM - 4:00 PM
Child Name: Birthday Child
Child Age: 4
Guest Count: 18 (15 included + 3 additional)
```

### 9.2 Party Booking Database Verification

- [ ] Verify booking in `party_bookings` table
- [ ] Verify status is "confirmed" after payment
- [ ] Verify `stripe_payment_intent_id` is populated
- [ ] Verify `total_price` is correct
- [ ] Verify `additional_kids_price` calculated correctly

### 9.3 Party Success Page

- [ ] Navigate to `/parties/success`
- [ ] Verify booking confirmation displays
- [ ] Verify booking details correct

### 9.4 Admin Party Management

- [ ] Access admin panel
- [ ] Navigate to party bookings
- [ ] Verify all bookings display
- [ ] Test filtering by status
- [ ] Test updating booking status

---

## 🔟 Gift Card System

### 10.1 Purchase Gift Card

- [ ] Navigate to `/gift-cards`
- [ ] Verify denominations display
- [ ] Select an amount (e.g., $50)
- [ ] Enter purchaser info
- [ ] Enter recipient info
- [ ] Add personal message
- [ ] Select delivery method (email to recipient or email to self)
- [ ] Proceed to checkout
- [ ] Complete payment with test card
- [ ] Verify success page

**Test Data:**

```
Amount: $50
Purchaser Name: Gift Giver
Purchaser Email: giftgiver@busybees.test
Recipient Name: Lucky Recipient
Recipient Email: recipient@busybees.test
Message: Enjoy your play time!
Delivery: Email to recipient
```

### 10.2 Gift Card Database Verification

- [ ] Verify record in `gift_cards` table
- [ ] Verify unique code generated (format: BBGC-XXXX-XXXX-XXXX)
- [ ] Verify `amount` and `remaining_amount` correct
- [ ] Verify status changes from "pending" to "sent" after email
- [ ] Verify `email_sent_at` is populated

### 10.3 Gift Card Email Delivery

- [ ] Check recipient email inbox
- [ ] Verify email contains gift card code
- [ ] Verify email contains correct amount
- [ ] Verify personal message included

### 10.4 Gift Card Redemption

- [ ] Navigate to `/gift-cards/redeem`
- [ ] Enter gift card code
- [ ] Click "Check Balance"
- [ ] Verify balance displays correctly
- [ ] Login as customer (or signup)
- [ ] Redeem gift card to account
- [ ] Verify user's `gift_card_balance` updated
- [ ] Verify gift card status = "redeemed"
- [ ] Verify `redemption` record created

### 10.5 Using Gift Card Balance

- [ ] With balance on account, attempt purchase
- [ ] Verify balance can be applied to purchase
- [ ] Verify correct amount deducted
- [ ] Verify remaining balance (if any) for future use

---

## 1️⃣1️⃣ Stripe Webhook Verification

### 11.1 Webhook Configuration Check

- [ ] Verify webhook URL configured in Stripe Dashboard
- [ ] Verify webhook secret stored in settings/env
- [ ] Verify webhook endpoint accessible

### 11.2 Checkout Session Completed Event

- [ ] Complete a test purchase
- [ ] Check Stripe Dashboard > Webhooks
- [ ] Verify `checkout.session.completed` event sent
- [ ] Verify event successfully received (200 response)
- [ ] Verify purchase record created in database

### 11.3 Payment Intent Events

- [ ] Verify `payment_intent.succeeded` handled
- [ ] Verify `payment_intent.payment_failed` handled (test with declined card)

### 11.4 Setup Intent Events (Payment Method)

- [ ] Add new payment method
- [ ] Verify `setup_intent.succeeded` event
- [ ] Verify payment method saved to database

---

## 1️⃣2️⃣ Admin Panel Functions

### 12.1 Customer Management

- [ ] Access admin panel (PIN: 1234)
- [ ] View customer list
- [ ] Search for specific customer
- [ ] View customer details
- [ ] View customer's purchases
- [ ] View customer's children
- [ ] View customer's sessions

### 12.2 Product/Pass Management

- [ ] View pass products
- [ ] Edit pass details (name, price)
- [ ] Toggle pass active/inactive
- [ ] Verify Stripe product sync

### 12.3 Promo Management

- [ ] View current promos
- [ ] Create new promo
- [ ] Set discount percentage
- [ ] Set date range
- [ ] Select banner style
- [ ] Save promo
- [ ] Verify promo displays on homepage (if active and within date range)

### 12.4 Gift Card Denominations

- [ ] View denominations
- [ ] Add new denomination
- [ ] Edit existing denomination
- [ ] Toggle active/inactive
- [ ] Delete denomination

---

## 1️⃣3️⃣ Email System Verification

### 13.1 Transactional Emails

- [ ] New customer signup - welcome email
- [ ] Password reset email
- [ ] Party booking confirmation email
- [ ] Gift card delivery email
- [ ] Purchase confirmation email

### 13.2 Check Resend Dashboard

- [ ] Login to Resend dashboard
- [ ] Verify emails are being sent
- [ ] Check delivery status
- [ ] Review any bounced/failed emails

---

## 1️⃣4️⃣ Mobile/Responsive Testing

### 14.1 POS on Tablet

- [ ] Test on iPad or tablet-sized screen
- [ ] Verify all buttons tappable
- [ ] Verify forms easy to fill
- [ ] Verify modals display correctly

### 14.2 Customer Portal on Mobile

- [ ] Test on mobile device
- [ ] Verify navigation works
- [ ] Verify checkout flow works
- [ ] Verify all pages responsive

---

## 1️⃣5️⃣ Error Handling & Edge Cases

### 15.1 Network Errors

- [ ] Test behavior when offline
- [ ] Test with slow connection
- [ ] Verify error messages are user-friendly

### 15.2 Validation Errors

- [ ] Submit forms with missing required fields
- [ ] Submit invalid email formats
- [ ] Submit invalid phone formats
- [ ] Verify error messages display

### 15.3 Concurrent Sessions

- [ ] Login same customer on two devices
- [ ] Make purchase on one
- [ ] Verify data reflects on both after refresh

---

## 🔴 Issues Found

Use this section to document any issues discovered during testing.

### Critical Issues (Blockers)

| #   | Description                         | Steps to Reproduce           | Status   |
| --- | ----------------------------------- | ---------------------------- | -------- |
| 1   | No welcome email sent on POS signup | Sign up new customer via POS | ✅ FIXED |
| 2   |                                     |                              |          |
| 3   |                                     |                              |          |

### Issue #1 Details: POS Welcome Email Missing

**Found:** Dec 28, 2025 **Fixed:** Dec 28, 2025 **Root Cause:** The POS signup route
(`/api/auth/pos-signup`) created user accounts but never called any email function.
**Fix:** Added `sendWelcomeEmail()` function to `resend.ts` and integrated it into the
signup flow. **Verification:** Ensure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set
in `.env.local`

### High Priority Issues

| #   | Description | Steps to Reproduce | Status |
| --- | ----------- | ------------------ | ------ |
| 1   |             |                    |        |
| 2   |             |                    |        |
| 3   |             |                    |        |

### Medium Priority Issues

| #   | Description | Steps to Reproduce | Status |
| --- | ----------- | ------------------ | ------ |
| 1   |             |                    |        |
| 2   |             |                    |        |
| 3   |             |                    |        |

### Low Priority / Polish

| #   | Description | Steps to Reproduce | Status |
| --- | ----------- | ------------------ | ------ |
| 1   |             |                    |        |
| 2   |             |                    |        |
| 3   |             |                    |        |

---

## 📊 Testing Progress Summary

| Section                   | Total Items | Completed | Pass Rate |
| ------------------------- | ----------- | --------- | --------- |
| 1. POS Login/Registration | 12          |           |           |
| 2. Children Management    | 10          |           |           |
| 3. Pass Purchasing        | 13          |           |           |
| 4. Check-In/Out           | 14          |           |           |
| 5. Payment Methods        | 9           |           |           |
| 6. Inactivity Timeout     | 6           |           |           |
| 7. Web Customer Portal    | 14          |           |           |
| 8. Web Pass Purchasing    | 11          |           |           |
| 9. Party Booking          | 26          |           |           |
| 10. Gift Cards            | 15          |           |           |
| 11. Stripe Webhooks       | 8           |           |           |
| 12. Admin Panel           | 13          |           |           |
| 13. Email System          | 7           |           |           |
| 14. Mobile/Responsive     | 6           |           |           |
| 15. Error Handling        | 6           |           |           |
| **TOTAL**                 | **170**     |           |           |

---

## 🚀 Launch Readiness Checklist

Before going live, ensure:

- [ ] All Critical issues resolved
- [ ] All High Priority issues resolved
- [ ] Stripe keys switched from test to live mode
- [ ] Webhook URL updated to production domain
- [ ] All test data cleaned from production database
- [ ] DNS configured correctly
- [ ] SSL certificate valid
- [ ] Error monitoring enabled (Sentry)
- [ ] Logging configured (Logfire)
- [ ] Backup system verified
- [ ] Staff trained on POS system

---

## 📝 Notes & Observations

Use this space for any additional notes during testing:

```
[Add your notes here]
```

---

**Prepared by:** AI Assistant **Document Version:** 1.0 **Testing Start Date:**
******\_\_\_****** **Testing End Date:** ******\_\_\_****** **Sign-off:**
******\_\_\_******
