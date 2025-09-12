function requireFields(fields = []) {
	return function (req, res, next) {
		for (const f of fields) {
			if (!req.body || req.body[f] == null || req.body[f] === '') {
				return res.status(400).json({ message: `Missing field: ${f}` });
			}
		}
		return next();
	};
}

module.exports = { requireFields };
