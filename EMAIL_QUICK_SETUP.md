# 🚀 Quick Email Setup - 5 Minutes

## For Gmail Users (Easiest)

### Step 1: Get App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" → "Windows Computer"
3. Copy the 16-character password

### Step 2: Update `.env`
```bash
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=paste-16-char-password-here
```

### Step 3: Restart Server
```bash
# Press Ctrl+C to stop
npm run dev
```

### Step 4: Test
1. Create a new alert with email enabled
2. Check your email inbox for confirmation

---

## Email Configuration by Provider

### Gmail
```
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
```

### Outlook
```
EMAIL_USER=your.email@outlook.com
EMAIL_PASS=your-password
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### Yahoo
```
EMAIL_USER=your.email@yahoo.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=465
EMAIL_SECURE=true
```

### Custom SMTP
```
EMAIL_USER=your.email@domain.com
EMAIL_PASS=your-password
EMAIL_HOST=your-smtp-host.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

---

## Features

✅ **Automatic Confirmations** - Get email when alert is created  
✅ **Reminder Emails** - Request summary of active alerts  
✅ **Real-time Prices** - Emails include current market prices  
✅ **Beautiful Design** - Professional HTML templates  

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Emails not sending | Check `EMAIL_USER` and `EMAIL_PASS` in `.env` |
| Gmail not working | Use **App Password**, not regular password |
| Wrong SMTP | Verify `EMAIL_HOST` and `EMAIL_PORT` |
| Still not working? | Check server logs for error messages |

---

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed guide.
