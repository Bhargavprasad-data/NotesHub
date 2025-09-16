const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Note = require('../models/Note');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendUploadNotification } = require('../utils/mailer');

const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (_req, _file, cb) { cb(null, uploadDir); },
	filename: function (_req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(null, unique + path.extname(file.originalname));
	}
});

const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const upload = multer({
	storage,
	limits: { fileSize: 25 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (allowed.includes(file.mimetype)) return cb(null, true);
		cb(new Error('Only PDF/DOC/DOCX files allowed'));
	}
});

router.get('/', async (req, res) => {
	try {
		const { category, institute, state, district, department, stream, year, semester, classLevel, subject, q } = req.query;
		const filter = {};
		if (category) filter.category = category;
		if (institute) filter.institute = institute;
		if (state) {
			const safe = String(state).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			filter.state = new RegExp(`^${safe}`, 'i');
		}
		if (district) {
			const safe = String(district).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			filter.district = new RegExp(`^${safe}`, 'i');
		}
		if (department) filter.departments = department;
		if (stream) filter.stream = stream;
		if (year) filter.year = year;
		if (semester) filter.semester = semester;
		if (classLevel) filter.classLevel = classLevel;
		if (subject) filter.subject = subject;
		if (q) filter.$or = [ { subject: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }, { tags: new RegExp(q, 'i') } ];
		const notes = await Note.find({ ...filter, status: 'approved' })
			.sort({ createdAt: -1 })
			.populate('owner', 'name email');
		return res.json(notes);
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Public stats: total approved notes, distinct colleges, distinct departments
router.get('/stats', async (_req, res) => {
    try {
        const [totalNotes, collegesAgg, departmentsAgg] = await Promise.all([
            Note.countDocuments({ status: 'approved' }),
            Note.aggregate([
                { $match: { status: 'approved', institute: { $type: 'string', $ne: '' } } },
                { $group: { _id: '$institute' } },
                { $count: 'count' }
            ]),
            Note.aggregate([
                { $match: { status: 'approved' } },
                { $unwind: { path: '$departments', preserveNullAndEmptyArrays: false } },
                { $match: { departments: { $type: 'string', $ne: '' } } },
                { $group: { _id: '$departments' } },
                { $count: 'count' }
            ])
        ]);

        const colleges = (collegesAgg && collegesAgg[0] && collegesAgg[0].count) || 0;
        const departments = (departmentsAgg && departmentsAgg[0] && departmentsAgg[0].count) || 0;
        return res.json({ totalNotes, colleges, departments });
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// Increment views for a note and return updated count
router.post('/:id/view', async (req, res) => {
    try {
        const note = await Note.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!note) return res.status(404).json({ message: 'Not found' });
        return res.json({ views: note.views });
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// View proxy - increments views and redirects to file URL
router.get('/:id/view', async (req, res) => {
    try {
        const note = await Note.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!note) return res.status(404).json({ message: 'Not found' });
        return res.redirect(note.fileUrl);
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// Inline embed endpoint to stream PDF without redirect (better for iframes)
router.get('/:id/embed', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Not found' });
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Type', 'application/pdf');
        // Try serve local upload directly
        try {
            const parsed = new URL(note.fileUrl);
            const urlPath = parsed.pathname;
            const fileNameOnDisk = path.basename(urlPath);
            const abs = path.resolve(uploadDir, fileNameOnDisk);
            if (fs.existsSync(abs)) {
                res.setHeader('Content-Disposition', `inline; filename="${note.fileName}"`);
                return fs.createReadStream(abs).pipe(res);
            }
        } catch (_) {}
        // Fallback: proxy the remote URL
        try {
            const url = note.fileUrl;
            const protocol = url.startsWith('https:') ? require('https') : require('http');
            protocol.get(url, (fileRes) => {
                if (fileRes.statusCode && fileRes.statusCode >= 300 && fileRes.statusCode < 400 && fileRes.headers.location) {
                    const redirectUrl = fileRes.headers.location.startsWith('http') ? fileRes.headers.location : url;
                    return protocol.get(redirectUrl, (r2) => r2.pipe(res)).on('error', () => res.status(502).end());
                }
                fileRes.pipe(res);
            }).on('error', () => res.status(502).end());
        } catch (_) {
            return res.status(500).end();
        }
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// Download proxy - require 2 uploads to access, then increment downloads and force file download
router.get('/:id/download', auth(), async (req, res) => {
    try {
        const uploadsCount = await Note.countDocuments({ owner: req.user.id });
        if (uploadsCount < 2) {
            return res.status(403).json({ message: 'Please upload at least 2 notes to download.' });
        }

        const note = await Note.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Not found' });
        if (note.status !== 'approved') return res.status(403).json({ message: 'This note is not approved yet.' });

        // Increment downloads (non-blocking best-effort)
        Note.updateOne({ _id: note._id }, { $inc: { downloads: 1 } }).catch(() => {});

        try {
            // Attempt to serve the local uploaded file directly
            const parsed = new URL(note.fileUrl);
            const urlPath = parsed.pathname; // /uploads/<filename>
            const fileNameOnDisk = path.basename(urlPath);
            const abs = path.resolve(uploadDir, fileNameOnDisk);
            if (fs.existsSync(abs)) {
                return res.download(abs, note.fileName);
            }

            // If not a local file, stream it through this server to force attachment
            const protocol = parsed.protocol === 'http:' ? require('http') : require('https');
            protocol.get(note.fileUrl, (fileRes) => {
                if (fileRes.statusCode && fileRes.statusCode >= 300 && fileRes.statusCode < 400 && fileRes.headers.location) {
                    // Follow one level of redirect
                    const redirectUrl = fileRes.headers.location.startsWith('http') ? fileRes.headers.location : `${parsed.protocol}//${parsed.host}${fileRes.headers.location}`;
                    return protocol.get(redirectUrl, (redirectRes) => {
                        res.setHeader('Content-Type', redirectRes.headers['content-type'] || 'application/octet-stream');
                        res.setHeader('Content-Disposition', `attachment; filename="${note.fileName}"`);
                        redirectRes.pipe(res);
                    }).on('error', () => res.redirect(note.fileUrl));
                }
                res.setHeader('Content-Type', fileRes.headers['content-type'] || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${note.fileName}"`);
                fileRes.pipe(res);
            }).on('error', () => res.redirect(note.fileUrl));
            return;
        } catch (_) {
            // Fallback: redirect to the file URL
            return res.redirect(note.fileUrl);
        }
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/mine', auth(), async (req, res) => {
	const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: -1 });
	return res.json(notes);
});

router.post('/', auth(['student', 'faculty']), upload.single('file'), async (req, res) => {
	try {
		const { category, institute, state, district, departments, stream, year, semester, classLevel, subject, description, tags, uPhone, uConsent } = req.body;
		if (!req.file) return res.status(400).json({ message: 'File required' });
		// Require explicit consent prior to upload
		if (String(uConsent) !== 'true') {
			return res.status(400).json({ message: 'Upload requires accountability consent' });
		}
		
		// Get user details for email notification
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ message: 'User not found' });

		// Determine uploader phone (prefer modal-provided if present)
		const uploaderPhone = (uPhone && String(uPhone).trim()) ? String(uPhone).trim() : (user.phone || '');

		// Capture uploader IP information
		const forwardedFor = String(req.headers['x-forwarded-for'] || '');
		const ipList = forwardedFor ? forwardedFor.split(',').map(s => s.trim()).filter(Boolean) : [];
		const uploaderIp = ipList.length ? ipList[0] : (req.ip || req.connection?.remoteAddress || '');
		
		const note = await Note.create({
			owner: req.user.id,
			category, institute,
			state, district,
			departments: departments ? [].concat(departments).flatMap((d)=> String(d).split(',').map((s)=>s.trim()).filter(Boolean)) : [],
			stream, year, semester, classLevel, subject, description,
			tags: tags ? String(tags).split(',').map((s)=>s.trim()) : [],
			fileUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
			fileName: req.file.originalname,
			fileSize: req.file.size,
			status: 'pending'
		});
		
		// Prepare signed moderation links and send email
		const secret = process.env.MODERATION_SECRET || (process.env.JWT_SECRET || 'dev_secret');
		const payload = JSON.stringify({ n: String(note._id), a: 'mod', t: Date.now() });
		const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
		const baseUrl = `${req.protocol}://${req.get('host')}`;
		const approveUrl = `${baseUrl}/api/notes/${note._id}/moderate?action=approve&payload=${encodeURIComponent(payload)}&sig=${sig}`;
		const rejectUrl = `${baseUrl}/api/notes/${note._id}/moderate?action=reject&payload=${encodeURIComponent(payload)}&sig=${sig}`;
		try {
			await sendUploadNotification(
				{ 
					id: user._id,
					name: user.name,
					email: user.email,
					phone: uploaderPhone,
					role: user.role,
					consent: true,
					ip: uploaderIp,
					approveUrl,
					rejectUrl
				},
				note
			);
			console.log('Upload notification email sent successfully');
		} catch (emailErr) {
			console.error('Failed to send upload notification email:', emailErr);
			// Continue with the response even if email fails
		}
		
		return res.status(201).json(note);
	} catch (err) {
		console.error('Error in upload:', err);
		return res.status(500).json({ message: 'Server error' });
	}
});

router.delete('/:id', auth(), async (req, res) => {
	const note = await Note.findById(req.params.id);
	if (!note) return res.status(404).json({ message: 'Not found' });
	if (String(note.owner) !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
	try {
		const full = path.resolve(__dirname, '../../', note.fileUrl.replace(/^\/+/,'').replace(/\\/g,'/'));
		if (fs.existsSync(full)) fs.unlinkSync(full);
	} catch (_) {}
	await note.deleteOne();
	return res.json({ ok: true });
});

router.get('/meta', async (_req, res) => {
	return res.json({
		categories: ['school','intermediate','engineering'],
		streams: ['MPC','BiPC','MEC'],
		engineeringDepartments: ['CSE','ECE','EEE','ME','CE','IT'],
		years: ['1','2','3','4'],
		semesters: ['1','2'],
		classes: ['1','2','3','4','5','6','7','8','9','10']
	});
});

// Get available departments for a given college and category
router.get('/departments/:college', async (req, res) => {
	try {
		const { college } = req.params;
		const { category } = req.query;
		if (!college || !category) {
			return res.json({ departments: [] });
		}

		const match = {
			institute: new RegExp(`^${college.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'i'),
			category: String(category)
		};

		const rows = await Note.aggregate([
			{ $match: match },
			{ $unwind: { path: '$departments', preserveNullAndEmptyArrays: false } },
			{ $group: { _id: null, all: { $addToSet: '$departments' } } }
		]);

		const departments = rows.length ? rows[0].all.sort((a, b) => String(a).localeCompare(String(b))) : [];
		return res.json({ departments });
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Get institute name suggestions by category and prefix
router.get('/institutes', async (req, res) => {
	try {
		const { category, prefix } = req.query;
		if (!category) return res.json({ institutes: [] });
		const match = { category: String(category) };
		if (prefix) {
			const safe = String(prefix).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			match.institute = new RegExp(`^${safe}`, 'i');
		}
		const rows = await Note.aggregate([
			{ $match: match },
			{ $group: { _id: '$institute' } },
			{ $limit: 50 }
		]);
		const institutes = rows.map(r => r._id).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
		return res.json({ institutes });
	} catch (err) {
		return res.status(500).json({ message: 'Server error' });
	}
});

// Get state suggestions by prefix (case-insensitive) and optional category
router.get('/states', async (req, res) => {
    try {
        const { prefix, category } = req.query;
        const match = {};
        if (category) match.category = String(category);
        if (prefix) {
            const safe = String(prefix).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            match.state = new RegExp(`^${safe}`, 'i');
        }
        const rows = await Note.aggregate([
            { $match: { ...match, state: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$state' } },
            { $limit: 50 }
        ]);
        const states = rows.map(r => r._id).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
        return res.json({ states });
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// Get district suggestions by prefix (case-insensitive) and optional category/state
router.get('/districts', async (req, res) => {
    try {
        const { prefix, category, state } = req.query;
        const match = {};
        if (category) match.category = String(category);
        if (state) match.state = String(state);
        if (prefix) {
            const safe = String(prefix).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            match.district = new RegExp(`^${safe}`, 'i');
        }
        const rows = await Note.aggregate([
            { $match: { ...match, district: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$district' } },
            { $limit: 50 }
        ]);
        const districts = rows.map(r => r._id).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
        return res.json({ districts });
    } catch (err) {
        return res.status(500).json({ message: 'Server error' });
    }
});

// Moderation endpoint must appear before module export
router.get('/:id/moderate', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, payload, sig } = req.query;
        if (!action || !payload || !sig) return res.status(400).send('Invalid request');
        const secret = process.env.MODERATION_SECRET || (process.env.JWT_SECRET || 'dev_secret');
        const calc = crypto.createHmac('sha256', secret).update(String(payload)).digest('hex');
        if (calc !== String(sig)) return res.status(403).send('Invalid signature');
        const data = JSON.parse(String(payload));
        if (String(data.n) !== String(id)) return res.status(400).send('Mismatched note');

        const note = await Note.findById(id);
        if (!note) return res.status(404).send('Not found');
        if (action === 'approve') {
            note.status = 'approved';
            await note.save();
            return res.send('Note approved successfully. You can close this tab.');
        } else if (action === 'reject') {
            note.status = 'rejected';
            await note.save();
            return res.send('Note rejected.');
        }
        return res.status(400).send('Unknown action');
    } catch (err) {
        return res.status(500).send('Server error');
    }
});

module.exports = router;