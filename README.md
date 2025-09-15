# NotesHub - Academic Library

A full‑stack web app to upload, browse, and securely share academic notes across School, Intermediate, and Engineering.

## Features

- Authentication (JWT) with login/register and show/hide password
- Upload notes with accountability (phone + consent modal)
- Admin email notification on upload with preview + Approve/Reject buttons
- Moderation workflow: notes are Pending → Approved/Rejected
- Download restriction: users must upload at least 2 notes to download
- Browse with filters: category, institute, state, district, department, year/semester (category‑aware)
- Dynamic suggestions with highlight behavior (institute, state, district)
- User profile with “My Uploads”, status badges (Pending/Approved/Rejected), manual Refresh, and auto polling + toast when approved
- Forgot password flow with branded email and reset screen
- CORS configured for local dev and deployment

## Authentication & Security

- JWT-based sessions: issued on login/register, stored client-side; backend guards protected routes with middleware
- Roles: `student` (default) and `faculty` supported; upload routes accept both
- Upload Authentication Modal: before uploading, users must submit phone number and consent; backend also captures IP address
- Admin Moderation: every upload triggers an admin email (preview + Approve/Reject links with HMAC-signed payload); only approved notes are visible/downloadable
- Download Policy: a user must have uploaded at least 2 notes to download any note
- Password Reset: users request a reset link (email sent to their address) and set a new password via `/reset-password?token=...` (1-hour expiry)

## Tech Stack

- Frontend: React + TypeScript, Tailwind, Framer Motion
- Backend: Node.js, Express, Multer, Mongoose (MongoDB), JWT, Nodemailer/Resend

## Local Setup

1. Prerequisites: Node 18+, MongoDB (Atlas or local)
2. Clone repo and install

```bash
# backend
cd backend
npm install

# frontend
cd ../frontend
npm install
```

3. Environment

Create `backend/.env` with:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
UPLOAD_DIR=uploads
CLIENT_ORIGIN=http://localhost:3000
EMAIL_ENABLED=true

# Resend (recommended)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=NotesHub <no-reply@yourdomain.com>

# OR Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Optional moderation secret (defaults to JWT_SECRET)
MODERATION_SECRET=change_me
```

4. Run

```bash
# terminal 1
cd backend
npm start

# terminal 2
cd frontend
npm start
```

Frontend dev uses `GENERATE_SOURCEMAP=false` to suppress third‑party sourcemap warnings.

## How It Works

- Upload flow: User fills note form → clicks Upload → modal asks phone + consent → note saved as Pending → admin receives email with Preview + Approve/Reject → on Approve, note appears in Browse and is downloadable
- Download rule: A user must have uploaded at least 2 notes to download any note
- Forgot password: User requests link → email sent to that user → opens `/reset-password?token=...` → sets new password
- Profile: Shows your uploads with status badges; a “Refresh status” button and a 10s poll trigger a toast when a note becomes approved

## API (selected)

- POST `/api/notes` (auth) — upload (stores as pending)
- GET `/api/notes` — list approved notes with filters
- GET `/api/notes/:id/download` (auth) — download approved notes (requires 2 uploads)
- GET `/api/notes/:id/moderate?action=approve|reject&payload&sig` — admin moderation link (signed)
- GET `/api/notes/mine` (auth) — current user’s uploads
- POST `/api/auth/register|login`
- POST `/api/auth/forgot-password` — sends reset email to the user
- POST `/api/auth/reset-password` — set new password using token

## Deployment Notes

- Ensure `frontend` is part of the main repo (no nested git)
- Configure environment variables on the platform (Render/Vercel/Railway)
- Set `CLIENT_ORIGIN` to your deployed frontend URL and allow it in backend CORS

## Troubleshooting

- Gmail 534 App Password error: create a Gmail App Password and use it as `SMTP_PASS`
- Resend domain: verify `RESEND_FROM` domain in Resend dashboard
- MongoDB ENOTFOUND: verify Atlas connection string and IP allowlist

---
Built with ❤️ for students and educators.




