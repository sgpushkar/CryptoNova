# 📧 Email Reminders Setup Guide

CryptoNova now sends email confirmations when you create alerts and can send periodic reminder emails about your active alerts.

## Features

✅ **Alert Creation Confirmation** - Automatically sent when you create a new alert with email enabled  
✅ **Alert Reminders** - Request reminder emails about all your active alerts  
✅ **Beautiful HTML Emails** - Professional formatted emails with current price data  
✅ **Multiple Provider Support** - Gmail, Outlook, or any SMTP provider  

## Email Features Included

### 1. **Alert Confirmation Email**
When you create an alert with email enabled, you'll automatically receive a confirmation email containing:
- Asset name and symbol
- Alert condition details
- Current price in INR and USD
- Link back to the dashboard

### 2. **Reminder Emails**
Request a reminder email anytime to see a summary of all your active alerts with current prices:
- Table of all active alerts
- Current prices for each monitored asset
- Alert conditions and targets
- Direct dashboard link

## Setup Instructions

### Step 1: Get Email Credentials

#### Option A: Using Gmail (Recommended)

1. Go to [Google Account Security Settings](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Windows Computer"
5. Google will generate a 16-character password
6. Copy this password (you'll use it in Step 2)

**Note:** Do NOT use your regular Gmail password. Always use the App Password generated for this app.

#### Option B: Using Outlook/Microsoft 365

1. Go to [Account Security](https://account.microsoft.com/security)
2. Create an [App Password](https://account.microsoft.com/security/app-passwords) if available
3. Or use your regular Outlook password if app passwords are not available

#### Option C: Using Other Email Providers

For providers like SendGrid, Mailgun, or your corporate email:
- Contact your email provider for SMTP credentials
- Typical SMTP host: `smtp.[provider].com`
- Typical port: `587` (TLS) or `465` (SSL)

### Step 2: Configure Environment Variables

Open `/server/.env` and update these fields:

```bash
# Gmail Example
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true

# Outlook Example
EMAIL_USER=your.email@outlook.com
EMAIL_PASS=your-password
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Generic SMTP Example
EMAIL_USER=your.email@domain.com
EMAIL_PASS=your-password
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Environment Variables:**
- `EMAIL_USER` - Your email address
- `EMAIL_PASS` - Your email password or app password
- `EMAIL_HOST` - SMTP server hostname (default: smtp.gmail.com)
- `EMAIL_PORT` - SMTP port (default: 465)
- `EMAIL_SECURE` - Use SSL/TLS (default: true)

### Step 3: Restart the Server

After updating the `.env` file, restart your server:

```bash
# Stop the current server (Ctrl+C in the terminal)
# Then restart it
npm run dev
```

### Step 4: Test Your Configuration

1. Open the CryptoNova dashboard
2. Create a new alert with **email enabled**
3. You should receive a confirmation email within seconds
4. Check the email subject line for "Alert created for [CoinName] on CryptoNova"

## Using Email Reminders

### Automatic Confirmations (Always On)
When you create an alert with email enabled, a confirmation is automatically sent. No additional setup needed!

### On-Demand Reminder Emails
To request a reminder email of all your active alerts:

1. Open the CryptoNova dashboard
2. Look for the "Send Reminder Email" button (typically in the alerts section)
3. Enter your email address
4. Click "Send"
5. You'll receive a summary email with all your active alerts

## Troubleshooting

### "Failed to send alert confirmation email" or "Email notification failed"

**Problem:** Emails are not being sent despite configuration
**Solutions:**
1. Verify `EMAIL_USER` and `EMAIL_PASS` are correct in `.env`
2. For Gmail, ensure you're using an **App Password**, not your regular password
3. Check that **2-Step Verification is enabled** on Gmail
4. Verify `EMAIL_HOST` and `EMAIL_PORT` are correct for your provider
5. Check server logs for detailed error messages
6. For Gmail, check [Security Alerts](https://myaccount.google.com/lesssecureapps) for blocked access

### "Valid email address is required"

**Problem:** Email validation failed
**Solution:** Ensure the email address you entered is in a valid format (example@domain.com)

### "You have no active alerts to remind about"

**Problem:** Cannot send reminder email
**Solution:** Create at least one active alert first

### Emails going to spam

**Problem:** Reminder emails appear in spam folder
**Solutions:**
1. Add the sender email to your contacts
2. Mark emails as "Not Spam" to train your email provider
3. Check your email provider's spam settings

## Security Notes

⚠️ **Important:** 
- Never commit your `.env` file to version control
- Always use App Passwords for Gmail, not your regular password
- If you accidentally expose credentials, regenerate them immediately
- Only the backend can access your email credentials

## Email Templates

### Confirmation Email
```
Subject: Alert created for [CoinName] on CryptoNova
- Shows: Asset, Symbol, Condition, Target, Current Price
- Beautiful HTML template with dark theme
```

### Reminder Email
```
Subject: CryptoNova: Reminder about your X active alert(s)
- Shows: Table of all active alerts
- Current prices in INR and USD
- Condition details for each alert
```

## Advanced Configuration

### Custom Email Host
If you want to use a custom SMTP server:

```bash
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=admin@yourdomain.com
EMAIL_PASS=your-password
```

### Disable Email Notifications
To disable email entirely, leave `EMAIL_USER` and `EMAIL_PASS` empty in `.env`

## Support

For issues with email setup:
1. Check the server console for error messages
2. Verify email provider SMTP settings
3. Test with a simple email client first to confirm credentials work
4. Review this guide's troubleshooting section

---

**Last Updated:** April 2024  
**Email System:** Node Mailer v6.9+
