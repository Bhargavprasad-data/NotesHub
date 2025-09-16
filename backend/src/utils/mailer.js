const nodemailer = require('nodemailer');

// Prefer explicit SMTP settings if provided, else fallback to Gmail service
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpSecure = process.env.SMTP_SECURE ? String(process.env.SMTP_SECURE).toLowerCase() === 'true' : false;
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'bhargavvana80@gmail.com';
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

// New: Resend HTTP API
const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || smtpUser; // fallback to smtp user if provided
const adminEmail = process.env.ADMIN_EMAIL || 'bhargavvana80@gmail.com';

// Email configuration validation
let emailConfigValid = false;
let emailConfigChecked = false;

function validateEmailConfig() {
  if (emailConfigChecked) return emailConfigValid;
  
  // Ultra strict validation - only allow if we have REAL working configurations
  const hasValidResend = resendApiKey && 
                        resendFrom && 
                        resendApiKey.length > 20 && 
                        resendApiKey.startsWith('re_') &&
                        resendFrom.includes('@') &&
                        resendFrom.includes('.') &&
                        !resendFrom.includes('yourdomain.com') && // Block placeholder domains
                        !resendFrom.includes('yourrealdomain.com') &&
                        !resendFrom.includes('example.com') &&
                        !resendFrom.includes('test.com') &&
                        !resendFrom.includes('placeholder') &&
                        !resendFrom.includes('your') &&
                        !resendFrom.includes('domain');
                        
  const hasValidSMTP = smtpUser && 
                      smtpPass && 
                      smtpUser.includes('@') && 
                      smtpUser.includes('.') &&
                      smtpPass.length > 10 &&
                      !smtpUser.includes('your-email@gmail.com') && // Block placeholder emails
                      !smtpUser.includes('example@gmail.com');
  
  emailConfigValid = hasValidResend || hasValidSMTP;
  emailConfigChecked = true;
  
  if (!emailConfigValid) {
    console.log('Email configuration validation failed - using placeholder/invalid values:');
    console.log('- Resend valid:', hasValidResend, '(API key:', resendApiKey ? 'present' : 'missing', ', From:', resendFrom || 'missing', ')');
    console.log('- SMTP valid:', hasValidSMTP, '(User:', smtpUser || 'missing', ', Pass:', smtpPass ? 'present' : 'missing', ')');
    console.log('To fix: Set up proper email configuration or set EMAIL_ENABLED=false');
  }
  
  return emailConfigValid;
}

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

async function sendWithResend({ subject, html, to }) {
  if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');
  if (!resendFrom) throw new Error('RESEND_FROM not configured');
  const recipient = to || adminEmail; // Use provided email or fallback to admin
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: resendFrom, to: [recipient], subject, html })
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

  // Check if we have any valid email configuration before attempting to send
  if (!validateEmailConfig()) {
    return { disabled: true, message: 'No valid email configuration' };
  }

  // Double-check: if we don't have proper environment variables, don't attempt
  if (!resendApiKey && !smtpUser) {
    return { disabled: true, message: 'No email environment variables' };
  }

  // Triple-check: if we have placeholder values, don't attempt
  if ((resendFrom && (resendFrom.includes('yourdomain.com') || 
                     resendFrom.includes('yourrealdomain.com') || 
                     resendFrom.includes('your') || 
                     resendFrom.includes('placeholder'))) || 
      (smtpUser && (smtpUser.includes('your-email@gmail.com') || 
                   smtpUser.includes('your') || 
                   smtpUser.includes('placeholder')))) {
    return { disabled: true, message: 'Placeholder configuration detected' };
  }
  const moderation = (user.approveUrl && user.rejectUrl) ? `
      <hr>
      <h3>Moderation</h3>
      <p>This upload is <strong>pending</strong>. Please review and approve or reject.</p>
      <div style="margin:12px 0; display:flex; gap:12px;">
        <a href="${user.approveUrl}" style="background:#16a34a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600">Approve</a>
        <a href="${user.rejectUrl}" style="background:#dc2626;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600">Reject</a>
      </div>
  ` : '';

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
      <p><strong>Preview:</strong> <a href="${note.fileUrl}" target="_blank" rel="noopener noreferrer">Open PDF</a></p>
      <p><strong>Upload Time:</strong> ${new Date().toLocaleString()}</p>
      ${moderation}
    `;

  const subject = 'New Note Upload Notification';

  // Try Resend first if properly configured
  const hasValidResend = resendApiKey && resendFrom && resendApiKey.length > 10;
  if (hasValidResend) {
    try {
      const info = await sendWithResend({ subject, html, to: adminEmail });
      console.log('Resend email sent:', info?.id || 'ok');
      return info;
    } catch (e) {
      console.error('Resend email failed:', e && e.message ? e.message : e);
      // fall through to SMTP only if Resend fails
    }
  }

  // Fallback to SMTP/Nodemailer if properly configured
  const hasValidSMTP = smtpUser && smtpPass && smtpUser.includes('@') && smtpPass.length > 5;
  if (hasValidSMTP) {
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
      // Don't throw error, just return disabled status
      return { disabled: true, error: 'Email sending failed' };
    }
  }

  // This should not be reached due to the check above, but just in case
  return { disabled: true, message: 'No valid email configuration' };
}

/**
 * Send password reset email to user
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} resetUrl - Password reset URL with token
 * @returns {Promise} - The result of the email sending operation
 */
async function sendPasswordResetEmail(email, name, resetUrl) {
  // Allow disabling email to avoid terminal errors in non-configured envs
  if (String(process.env.EMAIL_ENABLED || 'true').toLowerCase() !== 'true') {
    console.log('Email disabled by EMAIL_ENABLED=false - Password reset email not sent');
    return { disabled: true };
  }

  // Check if we have any valid email configuration before attempting to send
  if (!validateEmailConfig()) {
    console.log('No valid email configuration found - Password reset email not sent');
    return { disabled: true, message: 'No valid email configuration' };
  }

  // Double-check: if we don't have proper environment variables, don't attempt
  if (!resendApiKey && !smtpUser) {
    console.log('No email environment variables found - Password reset email not sent');
    return { disabled: true, message: 'No email environment variables' };
  }

  // Triple-check: if we have placeholder values, don't attempt
  if ((resendFrom && (resendFrom.includes('yourdomain.com') || 
                     resendFrom.includes('yourrealdomain.com') || 
                     resendFrom.includes('your') || 
                     resendFrom.includes('placeholder'))) || 
      (smtpUser && (smtpUser.includes('your-email@gmail.com') || 
                   smtpUser.includes('your') || 
                   smtpUser.includes('placeholder')))) {
    console.log('Placeholder email configuration detected - Password reset email not sent');
    return { disabled: true, message: 'Placeholder configuration detected' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #3b82f6;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>You requested a password reset for your NotesHub account. Click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
      
      <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
      
      <p>If you didn't request this password reset, please ignore this email.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px;">
        This email was sent from NotesHub. If you have any questions, please contact support.
      </p>
    </div>
  `;

  const subject = 'Reset Your NotesHub Password';

  // Try Resend first if properly configured
  const hasValidResend = resendApiKey && resendFrom && resendApiKey.length > 10;
  if (hasValidResend) {
    try {
      const info = await sendWithResend({ subject, html, to: email });
      console.log('Password reset email sent via Resend:', info?.id || 'ok');
      return info;
    } catch (e) {
      console.error('Resend password reset email failed:', e && e.message ? e.message : e);
      // fall through to SMTP only if Resend fails
    }
  }

  // Fallback to SMTP/Nodemailer if properly configured
  const hasValidSMTP = smtpUser && smtpPass && smtpUser.includes('@') && smtpPass.length > 5;
  if (hasValidSMTP) {
    const mailOptions = {
      from: resendFrom || smtpUser,
      to: email,
      subject,
      html
    };
  try {
    const info = await transporter.sendMail(mailOptions);
      console.log('Password reset email sent via SMTP:', info.response || 'ok');
    return info;
  } catch (error) {
      console.error('SMTP password reset email failed:', error && error.message ? error.message : error);
      // Don't throw error, just log it and return a success response
      console.log('Password reset email sending failed, but continuing with password reset process...');
      return { error: 'Email sending failed', butPasswordReset: 'still processed' };
    }
  }

  // This should not be reached due to the check above, but just in case
  console.log('No valid email provider configured - Password reset email not sent');
  return { disabled: true, message: 'No valid email configuration' };
}

module.exports = {
  sendUploadNotification,
  sendPasswordResetEmail
};