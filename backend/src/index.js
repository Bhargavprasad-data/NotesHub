const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const passport = require('passport');

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const oauthRoutes = require('./routes/oauth');
let prisma = null;
try { prisma = require('./prisma').prisma; } catch (_) {}
const { notFound, errorHandler } = require('./middleware/error');

// Added: verify mailer at startup
let verifyMailer = async () => {};
try {
	const nodemailer = require('nodemailer');
	const smtpHost = process.env.SMTP_HOST;
	const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
	const smtpSecure = process.env.SMTP_SECURE ? String(process.env.SMTP_SECURE).toLowerCase() === 'true' : undefined;
	const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
	const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
	let transporter;
	if (smtpHost) {
		transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort ?? 587, secure: smtpSecure ?? false, auth: { user: smtpUser, pass: smtpPass } });
	} else {
		transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: smtpUser, pass: smtpPass } });
	}
	verifyMailer = async () => {
		const emailEnabled = String(process.env.EMAIL_ENABLED || 'true').toLowerCase() === 'true';
		if (!emailEnabled) {
			console.log('Mailer disabled by EMAIL_ENABLED=false');
			return;
		}
		try {
			await transporter.verify();
			console.log('Mailer ready');
		} catch (e) {
			console.error('Mailer configuration error:', e && e.message ? e.message : e);
			console.log('To fix email issues:');
			console.log('1. Set EMAIL_ENABLED=false to disable emails');
			console.log('2. Or configure RESEND_API_KEY for Resend service');
			console.log('3. Or set up Gmail App Password for SMTP');
		}
	};
} catch (_) {}

const app = express();

// Security headers; allow embedding PDFs from this API in the frontend app
app.use(helmet({
    frameguard: false,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
// CORS configuration for both development and production
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'http://localhost:3001',  // Alternative local port
  process.env.CLIENT_ORIGIN  // Production URL from env
].filter(Boolean); // Remove any undefined values

app.use(cors({ 
  origin: allowedOrigins.length > 0 ? allowedOrigins : '*', 
  credentials: true 
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(passport.initialize());

const uploadsDir = path.resolve(__dirname, `../${process.env.UPLOAD_DIR || 'uploads'}`);
app.use('/uploads', (req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/notes', notesRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/noteshub3d';

async function start() {
	try {
		if (process.env.DATABASE_URL && prisma) {
			await prisma.$connect();
			console.log('Prisma connected to Postgres');
		} else {
			await mongoose.connect(MONGO_URI);
			console.log('MongoDB connected');
		}
		await verifyMailer();
		app.listen(PORT, () => {
			console.log(`Server running on http://localhost:${PORT}`);
		});
	} catch (err) {
		console.error('Failed to start server', err);
		process.exit(1);
	}
}

start();