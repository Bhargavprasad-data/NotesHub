const mongoose = require('mongoose');

const CATEGORIES = ['school', 'intermediate', 'engineering'];

const noteSchema = new mongoose.Schema(
	{
		owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		category: { type: String, enum: CATEGORIES, required: true, index: true },
		institute: { type: String, required: true, trim: true, index: true, maxlength: 120 },
		state: { type: String, trim: true, index: true, maxlength: 60 },
		district: { type: String, trim: true, index: true, maxlength: 80 },
		departments: [{ type: String, trim: true, maxlength: 40 }],
		stream: { type: String, trim: true, maxlength: 40 },
		year: { type: String, trim: true, maxlength: 10 },
		semester: { type: String, trim: true, maxlength: 10 },
		classLevel: { type: String, trim: true, maxlength: 10 },
		subject: { type: String, required: true, trim: true, index: true, maxlength: 120 },
		description: { type: String, trim: true, maxlength: 1000 },
		tags: [{ type: String, trim: true, index: true, maxlength: 30 }],
		fileUrl: { type: String, required: true },
		fileName: { type: String, required: true, maxlength: 200 },
		fileSize: { type: Number, min: 0, max: 25 * 1024 * 1024 },
		views: { type: Number, default: 0, min: 0 },
		downloads: { type: Number, default: 0, min: 0 },
		status: { type: String, enum: ['pending','approved','rejected'], default: 'pending', index: true },
		rejectedReason: { type: String, trim: true, maxlength: 300 }
	},
	{ timestamps: true }
);

noteSchema.pre('save', function(next) {
	if (this.tags && this.tags.length > 12) {
		return next(new Error('Too many tags (max 12)'));
	}
	next();
});

module.exports = mongoose.model('Note', noteSchema);