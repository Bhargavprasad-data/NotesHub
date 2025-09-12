const nodemailer = require('nodemailer');

// Prefer explicit SMTP settings if provided, else fallback to Gmail service
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpSecure = process.env.SMTP_SECURE ? String(process.env.SMTP_SECURE).toLowerCase() === 'true' : undefined;
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

// New: Resend HTTP API
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || smtpUser; // fallback to smtp user if provided
const adminEmail = process.env.ADMIN_EMAIL || 'bhargavvana80@gmail.com';

let transporter;
if (smtpHost) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort ?? 587,
    secure: smtpSecure ?? false,
    auth: { user: smtpUser, pass: smtpPass }
  });
} else {
  // Legacy fallback: Gmail service. Requires an App Password if 2FA is enabled
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: smtpUser, pass: smtpPass }
  });
}

async function sendWithResend({ subject, html }) {
  if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');
  if (!resendFrom) throw new Error('RESEND_FROM not configured');
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: resendFrom, to: [adminEmail], subject, html })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

/**
 * Send an email notification when a user uploads a note
 * @param {Object} user - The user who uploaded the note (may include phone override, consent, ip)
 * @param {Object} note - The note that was uploaded
 * @returns {Promise} - The result of the email sending operation
 */
async function sendUploadNotification(user, note) {
  // Allow disabling email to avoid terminal errors in non-configured envs
  if (String(process.env.EMAIL_ENABLED || 'true').toLowerCase() !== 'true') {
    return { disabled: true };
  }
  const extra = `
      <p><strong>Consent:</strong> ${user.consent ? 'Yes' : 'No'}</p>
      <p><strong>IP Address:</strong> ${user.ip || ''}</p>
  `;
  const html = `
      <h2>New Note Upload</h2>
      <p><strong>Uploaded by:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Phone:</strong> ${user.phone}</p>
      <p><strong>User Role:</strong> ${user.role}</p>
      <p><strong>User ID:</strong> ${user.id}</p>
      ${extra}
      <hr>
      <h3>Note Details:</h3>
      <p><strong>Subject:</strong> ${note.subject}</p>
      <p><strong>Category:</strong> ${note.category}</p>
      <p><strong>Institute:</strong> ${note.institute}</p>
      <p><strong>File Name:</strong> ${note.fileName}</p>
      <p><strong>File Size:</strong> ${(note.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
      <p><strong>Upload Time:</strong> ${new Date().toLocaleString()}</p>
    `;

  const subject = 'New Note Upload Notification';

  // Try Resend first if configured
  if (resendApiKey) {
    try {
      const info = await sendWithResend({ subject, html });
      console.log('Resend email sent:', info?.id || 'ok');
      return info;
    } catch (e) {
      console.error('Resend email failed:', e && e.message ? e.message : e);
      // fall through to SMTP
    }
  }

  // Fallback to SMTP/Nodemailer if available
  if (smtpUser && smtpPass) {
    const mailOptions = {
      from: resendFrom || smtpUser,
      to: adminEmail,
      subject,
      html
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('SMTP email sent:', info.response || 'ok');
      return info;
    } catch (error) {
      console.error('SMTP email failed:', error && error.message ? error.message : error);
      throw error;
    }
  }

  throw new Error('No email provider configured (set RESEND_API_KEY or SMTP credentials)');
}

module.exports = {
  sendUploadNotification
};