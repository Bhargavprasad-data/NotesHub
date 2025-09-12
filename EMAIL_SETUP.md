# Email Notification Setup for Notes Upload

## Overview
When users upload notes, the system can notify the administrator by email. You can use either Resend (HTTP API) or SMTP. You can also disable emails entirely.

## Configuration Steps

### 1. Configure Email Provider (backend/.env)

Option A: Resend (recommended - no SMTP hassles)
```
EMAIL_ENABLED=true
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=Your App <onboarding@resend.dev>
ADMIN_EMAIL=bhargavvana80@gmail.com
```

Option B: SMTP (Gmail with App Password)
```
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=16_char_app_password
ADMIN_EMAIL=bhargavvana80@gmail.com
```

### 2. Gmail App Password (for SMTP option)
Gmail requires an App Password (not your normal password):

1. Go to your Google Account settings (https://myaccount.google.com/)
2. Navigate to Security > 2-Step Verification
3. Scroll down to "App passwords"
4. Generate a new app password for "Mail" and "Other (Custom name)" - name it "Notes App"
5. Copy the generated 16-character password
6. Paste this password as the value for SMTP_PASS in your .env file

### 3. Email Recipient
The system is currently configured to send all upload notifications to:
```
bhargavvana80@gmail.com
```

## Testing
1. Set provider env vars in `backend/.env`
2. Restart the backend
3. Upload a note
4. Check backend logs for: "Resend email sent" or "SMTP email sent"
5. Confirm mail arrives at `ADMIN_EMAIL`

## Troubleshooting

If emails are not being sent:

1. Check backend logs for provider errors
2. If using Gmail, ensure 2FA + App Password
3. Try STARTTLS (SMTP_PORT=587, SMTP_SECURE=false) if 465 fails
4. Consider using Resend to bypass SMTP issues

## Security Considerations

- Never commit secrets
- Use environment variables or a secrets manager in production
- Rotate App Passwords/API keys periodically

## Disable Emails
To disable sending and avoid terminal logs:
```
EMAIL_ENABLED=false
```