const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: String(process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
  },
});

async function sendMail({ to, subject, html }) {
  const user = process.env.EMAIL_USER;
  const pass = String(process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  if (!user || !pass) {
    console.warn('Email credentials not configured; skipping email send');
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
