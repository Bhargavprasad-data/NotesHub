const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireFields } = require('../middleware/validate');

router.post('/register', requireFields(['name','email','password','phone']), async (req, res) => {
	try {
		const { name, email, password, phone, role } = req.body;
		const existing = await User.findOne({ email });
		if (existing) return res.status(409).json({ message: 'Email already in use' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ name, email, passwordHash, phone, role: role || 'student' });
		const token = jwt.sign({ id: user._id, role: user.role, name: user.name, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
		return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
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
		return res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

module.exports = router;