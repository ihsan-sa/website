# EmailJS Setup Guide

To enable automatic email sending from your contact form, you need to set up EmailJS (it's free for up to 200 emails/month).

## Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up for a free account

## Step 2: Add Email Service
1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions
5. **Copy your Service ID** (you'll need this)

## Step 3: Create Email Template
1. Go to **Email Templates** in the dashboard
2. Click **Create New Template**
3. Use this template structure:
   ```
   Subject: Contact from {{from_name}}
   
   From: {{from_name}}
   Email: {{from_email}}
   
   Message:
   {{message}}
   ```
4. Set the "To Email" field to: `hi@ihsan.cc`
5. **Copy your Template ID** (you'll need this)

## Step 4: Get Your Public Key
1. Go to **Account** → **General**
2. Find your **Public Key**
3. **Copy it** (you'll need this)

## Step 5: Update Your Code
Open `src/App.js` and find these lines (around line 424-428):
```javascript
await emailjs.send(
  'YOUR_SERVICE_ID',      // Replace with your EmailJS service ID
  'YOUR_TEMPLATE_ID',     // Replace with your EmailJS template ID
  templateParams,
  'YOUR_PUBLIC_KEY'       // Replace with your EmailJS public key
);
```

Replace:
- `YOUR_SERVICE_ID` with your Service ID from Step 2
- `YOUR_TEMPLATE_ID` with your Template ID from Step 3
- `YOUR_PUBLIC_KEY` with your Public Key from Step 4

## That's it!
Your contact form will now automatically send emails to hi@ihsan.cc without opening any email client.

## Remove "Sent with EmailJS" Tag

The free plan includes a "Sent with EmailJS" tag at the bottom of emails. To remove it:

**Option 1: Upgrade to Paid Plan (Recommended)**
- Go to EmailJS dashboard → **Account** → **Billing**
- Upgrade to a paid plan (starts at $15/month)
- The tag will be automatically removed

**Option 2: Hide with CSS (Not Always Reliable)**
- In your EmailJS template, add this CSS in the template editor:
```css
<style>
  .emailjs-hidden { display: none !important; }
</style>
```
- This may not work in all email clients

**Note:** The free plan includes this branding tag. For professional use, consider upgrading to remove it.

## Testing
1. Fill out the form on your website
2. Submit it
3. Check your email inbox at hi@ihsan.cc
4. You should receive the message!

