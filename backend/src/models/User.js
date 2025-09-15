const mongoose = require('mongoose');

const EMAIL_REGEX = /^(?:[a-zA-Z0-9_'^&+%*-]+(?:\.[a-zA-Z0-9_'^&+%*-]+)*|"(?:[^"]|\\")+")@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/;

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, unique: true, lowercase: true, index: true, trim: true, match: EMAIL_REGEX },
		passwordHash: { type: String, required: true },
		phone: { type: String, required: function() { return this.isNew; }, trim: true },
		role: { type: String, enum: ['student', 'faculty'], default: 'student' },
		avatarUrl: { type: String },
		resetPasswordToken: { type: String },
		resetPasswordExpires: { type: Date },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('User', userSchema);