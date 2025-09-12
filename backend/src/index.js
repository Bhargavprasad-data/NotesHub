const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
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
		}
	};
} catch (_) {}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

const uploadsDir = path.resolve(__dirname, `../${process.env.UPLOAD_DIR || 'uploads'}`);
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/noteshub3d';

async function start() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log('MongoDB connected');
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