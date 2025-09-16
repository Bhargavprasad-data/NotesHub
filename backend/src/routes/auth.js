const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { requireFields } = require('../middleware/validate');
const { sendPasswordResetEmail } = require('../utils/mailer');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// duplicate declaration removed

// Avatar upload setup
const avatarDir = path.resolve(__dirname, '../../', (process.env.AVATAR_DIR || 'uploads/avatars'));
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = ['image/png','image/jpeg','image/jpg','image/webp'].includes(file.mimetype);
        cb(ok ? null : new Error('Only PNG/JPG/WEBP images allowed'), ok);
    }
});

router.post('/register', requireFields(['name','email','password','phone']), async (req, res) => {
	try {
		const { name, email, password, phone, role } = req.body;
		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ message: 'Email already in use' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ name, email, passwordHash, phone, role: role || 'student' });
		const token = jwt.sign({ id: user._id, role: user.role, name: user.name, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
		return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl } });
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

router.post('/login', requireFields(['email','password']), async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });
		if (!user) return res.status(401).json({ message: 'Invalid credentials' });
		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
		const token = jwt.sign({ id: user._id, role: user.role, name: user.name, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
		return res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatarUrl: user.avatarUrl } });
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Forgot Password - Request reset
router.post('/forgot-password', requireFields(['email']), async (req, res) => {
	try {
		const { email } = req.body;
		const user = await User.findOne({ email });
		
		if (!user) {
			// Don't reveal if email exists or not for security
			return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(32).toString('hex');
		const resetExpires = new Date(Date.now() + 3600000); // 1 hour

		// Save token to user
		user.resetPasswordToken = resetToken;
		user.resetPasswordExpires = resetExpires;
		await user.save({ validateBeforeSave: false });

		// Send reset email
		const resetUrl = `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
		
		try {
			const emailResult = await sendPasswordResetEmail(user.email, user.name, resetUrl);
			if (emailResult && emailResult.disabled) {
				console.log('Email sending disabled - Password reset token generated but email not sent');
			}
			return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
		} catch (emailError) {
			console.error('Email sending failed:', emailError);
			// Still return success to not reveal email issues
			return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
		}
	} catch (err) {
		console.error('Forgot password error:', err);
		return res.status(500).json({ message: 'Server error' });
	}
});

// Reset Password - Verify token and reset password
router.post('/reset-password', requireFields(['token', 'password']), async (req, res) => {
	try {
		const { token, password } = req.body;

		if (password.length < 6) {
			return res.status(400).json({ message: 'Password must be at least 6 characters' });
		}

		// Find user with valid token
		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpires: { $gt: Date.now() }
		});

		if (!user) {
			return res.status(400).json({ message: 'Invalid or expired reset token' });
		}

		// Update password
		const passwordHash = await bcrypt.hash(password, 10);
		user.passwordHash = passwordHash;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return res.json({ message: 'Password has been reset successfully' });
	} catch (err) {
		console.error('Reset password error:', err);
		return res.status(500).json({ message: 'Server error' });
	}
});

// Upload avatar (auth required)
router.post('/me/avatar', auth(), avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Avatar image required' });
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const fileUrl = `/uploads/avatars/${req.file.filename}`;
        user.avatarUrl = fileUrl;
        await user.save({ validateBeforeSave: false });
        return res.json({ avatarUrl: fileUrl });
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;