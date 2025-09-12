function notFound(req, res, next) {
	if (req.path.startsWith('/api/')) {
		return res.status(404).json({ message: 'Not Found' });
	}
	return next();
}

function errorHandler(err, _req, res, _next) {
	const status = err.status || 500;
	const message = err.message || 'Server error';
	if (process.env.NODE_ENV !== 'test') {
		// eslint-disable-next-line no-console
		console.error('[ERROR]', status, message);
	}
	return res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
