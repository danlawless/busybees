# Supabase Email Template Setup 📧

## How to Configure Branded Emails

### Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your BusyBees project
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure Email Templates

Supabase provides several email templates you can customize:

1. **Confirm signup** - Sent when users sign up
2. **Magic Link** - Sent for passwordless login
3. **Change Email Address** - Sent when email is changed
4. **Reset Password** - Sent for password reset

---

## 🐝 Busy Bees Branded Templates

### 1. Confirm Signup / Email Verification

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FEF3C7;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .brand {
      color: #ffffff;
      font-size: 32px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .content {
      padding: 40px 30px;
      color: #374151;
      line-height: 1.6;
    }
    h1 {
      color: #F59E0B;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(251, 191, 36, 0.3);
    }
    .button:hover {
      box-shadow: 0 6px 8px rgba(251, 191, 36, 0.4);
    }
    .footer {
      background-color: #FEF3C7;
      padding: 30px;
      text-align: center;
      color: #6B7280;
      font-size: 14px;
    }
    .footer a {
      color: #F59E0B;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">🐝</div>
      <div class="brand">Busy Bees</div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <h1>Welcome to Busy Bees!</h1>
      
      <p>Hi there! 👋</p>
      
      <p>Thank you for creating an account at Busy Bees Indoor Playground! We're so excited to have you join our hive.</p>
      
      <p>To complete your account setup and access all the features of your online portal, please verify your email address by clicking the button below:</p>
      
      <center>
        <a href="{{ .ConfirmationURL }}" class="button">
          ✓ Verify Email Address
        </a>
      </center>
      
      <p><strong>What you can do with your verified account:</strong></p>
      <ul>
        <li>🎫 Purchase passes and memberships online</li>
        <li>🎉 Book birthday parties</li>
        <li>👶 Manage your children's profiles</li>
        <li>📋 View purchase history and active passes</li>
        <li>⚙️ Update your account settings</li>
      </ul>
      
      <p><strong>Already visited us?</strong> You can still check in at our kiosk using your phone number and PIN!</p>
      
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
        If you didn't create an account with Busy Bees, you can safely ignore this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Busy Bees Indoor Playground</strong></p>
      <p>Where Fun Takes Flight! 🐝</p>
      <p style="margin-top: 15px;">
        <a href="{{ .SiteURL }}">Visit Our Website</a> · 
        <a href="{{ .SiteURL }}/contact">Contact Us</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        This email was sent to {{ .Email }}
      </p>
    </div>
  </div>
</body>
</html>
```

---

### 2. Magic Link / Passwordless Login

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FEF3C7;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .brand {
      color: #ffffff;
      font-size: 32px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .content {
      padding: 40px 30px;
      color: #374151;
      line-height: 1.6;
    }
    h1 {
      color: #F59E0B;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(251, 191, 36, 0.3);
    }
    .footer {
      background-color: #FEF3C7;
      padding: 30px;
      text-align: center;
      color: #6B7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐝</div>
      <div class="brand">Busy Bees</div>
    </div>
    
    <div class="content">
      <h1>Sign In to Your Account</h1>
      
      <p>Hi there! 👋</p>
      
      <p>Click the button below to sign in to your Busy Bees account:</p>
      
      <center>
        <a href="{{ .ConfirmationURL }}" class="button">
          🔐 Sign In to Busy Bees
        </a>
      </center>
      
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
        This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Busy Bees Indoor Playground</strong></p>
      <p>Where Fun Takes Flight! 🐝</p>
      <p style="margin-top: 15px; font-size: 12px;">
        This email was sent to {{ .Email }}
      </p>
    </div>
  </div>
</body>
</html>
```

---

### 3. Reset Password

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FEF3C7;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 0;
    }
    .header {
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .brand {
      color: #ffffff;
      font-size: 32px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .content {
      padding: 40px 30px;
      color: #374151;
      line-height: 1.6;
    }
    h1 {
      color: #F59E0B;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(251, 191, 36, 0.3);
    }
    .footer {
      background-color: #FEF3C7;
      padding: 30px;
      text-align: center;
      color: #6B7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐝</div>
      <div class="brand">Busy Bees</div>
    </div>
    
    <div class="content">
      <h1>Reset Your Password</h1>
      
      <p>Hi there! 👋</p>
      
      <p>We received a request to reset your password for your Busy Bees account.</p>
      
      <p>Click the button below to create a new password:</p>
      
      <center>
        <a href="{{ .ConfirmationURL }}" class="button">
          🔑 Reset Password
        </a>
      </center>
      
      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">
        This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will not be changed.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Busy Bees Indoor Playground</strong></p>
      <p>Where Fun Takes Flight! 🐝</p>
      <p style="margin-top: 15px; font-size: 12px;">
        This email was sent to {{ .Email }}
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Step 3: Apply Templates in Supabase

1. In Supabase Dashboard → **Authentication** → **Email Templates**
2. Select each template type
3. Paste the corresponding HTML above
4. Click **Save**

## Step 4: Configure Email Settings

In **Authentication** → **Settings** → **Email**:

- **Site URL:** `https://www.busybeesipc.com`
- **Redirect URLs:** Add:
  - `https://www.busybeesipc.com/customer/dashboard`
  - `https://www.busybeesipc.com/customer/verify-email`
  - `http://localhost:3000/*` (for development)

## Step 5: Customize From Address (Optional)

To use a custom email address like `hello@busybeesipc.com`:

1. Go to **Project Settings** → **Auth**
2. Configure **SMTP Settings** or use a provider like:
   - SendGrid
   - Postmark
   - AWS SES
   - Resend

---

## 🎨 Branding Colors Used

- **Primary Yellow:** `#FBBF24` (Amber 400)
- **Accent Orange:** `#F59E0B` (Amber 500)
- **Background Cream:** `#FEF3C7` (Amber 100)
- **Text Gray:** `#374151` (Gray 700)
- **Light Gray:** `#6B7280` (Gray 500)

## ✨ Features

✅ **Mobile Responsive** - Looks great on all devices  
✅ **Brand Consistent** - Matches website colors and style  
✅ **Professional** - Clean, modern design  
✅ **Clear CTAs** - Big, obvious buttons  
✅ **Friendly Tone** - Welcoming and warm  
✅ **Security Info** - Explains what to do if email was sent in error

---

## Testing Emails

After setup, test by:
1. Creating a new account at `/customer/signup`
2. Using "Forgot Password" feature
3. Check your email inbox for the styled email

**Note:** In development, check Supabase Dashboard → **Authentication** → **Logs** to see email events.

