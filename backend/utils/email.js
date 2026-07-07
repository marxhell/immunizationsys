const nodemailer = require('nodemailer');

// Clean the app password: Google App Passwords are 16 chars, no spaces
function cleanAppPassword(pass) {
  if (!pass) return '';
  return String(pass).replace(/\s+/g, '').trim();
}

// Create transporter with explicit Gmail SMTP settings for reliability
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = cleanAppPassword(process.env.EMAIL_PASS);

  if (!user || !pass) {
    console.warn('Email credentials not configured; emails will be skipped');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user,
      pass: pass,
    },
    // Timeout settings to prevent hanging
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

let transporter = null;

/**
 * Send an email notification
 * @param {{to: string, subject: string, html: string}} options
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendMail({ to, subject, html }) {
  const user = process.env.EMAIL_USER;
  const pass = cleanAppPassword(process.env.EMAIL_PASS);

  if (!user || !pass) {
    console.warn('Email credentials not configured; skipping email send');
    return { success: false, error: 'Email credentials not configured' };
  }

  if (!to) {
    console.warn('No recipient email provided; skipping');
    return { success: false, error: 'No recipient email' };
  }

  // Re-create transporter if credentials changed or not initialized
  if (!transporter) {
    transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'Failed to create email transporter' };
    }
  }

  try {
    // Gmail requires the from address to match the authenticated user
    const fromAddress = user;
    const fromName = process.env.EMAIL_FROM || 'Child Vaccination System';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);

    // If transporter failed (e.g., auth issue), reset it so it gets re-created next time
    if (error.code === 'EAUTH' || error.code === 'ECONNECTION') {
      transporter = null;
    }

    return { success: false, error: error.message };
  }
}

module.exports = { sendMail };
