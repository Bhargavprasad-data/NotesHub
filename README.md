# Notes Hub 3D

A full‑stack notes sharing app with secure uploads, rich browsing filters, and controlled downloads.

## Features
- Auth (JWT) with roles: student, faculty
- Upload notes (PDF/DOC/DOCX up to 25MB)
- Upload accountability modal: phone number + explicit consent; uploader IP captured
- Admin email notification on each upload (Resend or SMTP) – configurable
- Browse filters:
  - Category: school, intermediate, engineering
  - Institute search with suggestions
  - State and District filters with suggestions and case‑insensitive prefix matching/highlighting
  - Engineering: Department, Year(), Semester 
  - Intermediate: Stream, Year
  - School: Class
  - Free text search across subject/description/tags
- View note and secure Download (requires user to have uploaded ≥ 2 notes)
- Profile page with “My uploads” and simple stats

## Monorepo Structure
```
backend/    # Node.js + Express + MongoDB API
frontend/   # React + Vite + Tailwind UI
EMAIL_SETUP.md  # Detailed email configuration guide
```

## Prerequisites
- Node.js 18+
- MongoDB (local or cloud)

## Setup
1) Install deps
```
cd backend && npm install
cd ../frontend && npm install
```
2) Environment (create `backend/.env`):
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/noteshub3d
UPLOAD_DIR=uploads
CLIENT_ORIGIN=http://localhost:5173

# Email – choose ONE provider or disable
EMAIL_ENABLED=true
# Resend (recommended)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=Your App <onboarding@resend.dev>
ADMIN_EMAIL=bhargavvana80@gmail.com
# SMTP (fallback, optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=your_gmail@gmail.com
# SMTP_PASS=16_char_app_password
```
For full email options and troubleshooting, see EMAIL_SETUP.md.

## Run
- Backend (from `backend/`):
```
npm run dev   # or: npm start
```
- Frontend (from `frontend/`):
```
npm run dev
```
- Open: http://localhost:5173

## Key Workflows
- Upload: requires login → fill metadata → confirm phone + consent → file saved to `/uploads` → admin email sent (if enabled)
- Browse: filter by category/institute/state/district and more; suggestions appear as you type (case‑insensitive prefix)
- Download: user must have uploaded at least 2 notes; else, UI shows a message and backend enforces 403

## Security
- JWT auth middleware
- Helmet enabled
- File type and size validation
- Accountability (phone, consent, IP) for uploads

## Notes
- Uploaded files are served from `/uploads`
- Update `CLIENT_ORIGIN` in backend/.env if frontend runs on a different host/port

## License
MIT
