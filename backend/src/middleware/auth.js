const jwt = require('jsonwebtoken');

function auth(requiredRoles = []) {
	return function (req, res, next) {
		const authHeader = req.headers.authorization || '';
		const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
		if (!token) return res.status(401).json({ message: 'No token provided' });
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = decoded;
			if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
				return res.status(403).json({ message: 'Forbidden' });
			}
			return next();
		} catch (err) {
			return res.status(401).json({ message: 'Invalid token' });
		}
	};
}

module.exports = auth;