/**
 * Email Utility
 * Tries multiple methods in order:
 * 1. Gmail SMTP on port 587 (STARTTLS) with IPv4
 * 2. Gmail SMTP on port 465 (SSL) with IPv4
 * 3. SendGrid HTTPS API
 */

const nodemailer = require('nodemailer');
const https = require('https');
const dns = require('dns');

function cleanAppPassword(pass) {
  if (!pass) return '';
  return String(pass).replace(/\s+/g, '').trim();
}

function getSmtpIp() {
  return new Promise((resolve) => {
    dns.resolve4('smtp.gmail.com', (err, addresses) => {
      if (err || !addresses || !addresses.length) resolve(null);
      else resolve(addresses[0]);
    });
  });
}

async function trySendGmail({ to, subject, html }, port, secure) {
  const user = process.env.EMAIL_USER;
  const pass = cleanAppPassword(process.env.EMAIL_PASS);
  if (!user || !pass) return null;

  const smtpIp = await getSmtpIp();
  if (!smtpIp) return null;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpIp,
      port,
      secure,
      auth: { user, pass },
      tls: { servername: 'smtp.gmail.com' },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM || 'Child Vaccination System'}" <${user}>`,
      to,
      subject,
      html,
    });
    console.log(`[Gmail:${port}] Sent to ${to}: ${info.messageId}`);
    return { success: true, method: `gmail-${port}` };
  } catch (err) {
    console.log(`[Gmail:${port}] Failed: ${err.code}`);
    return null;
  }
}

async function sendViaSendGrid({ to, subject, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { success: false, error: 'No email method available' };

  const data = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: process.env.EMAIL_USER || 'ogarishelton@gmail.com', name: process.env.EMAIL_FROM || 'Child Vaccination System' },
    subject,
    content: [{ type: 'text/html', value: html }],
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[SendGrid] Sent to ${to}`);
          resolve({ success: true, method: 'sendgrid' });
        } else {
          resolve({ success: false, error: `SendGrid ${res.statusCode}` });
        }
      });
    });
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
    req.write(data);
    req.end();
  });
}

async function sendMail({ to, subject, html }) {
  if (!to) return { success: false, error: 'No recipient' };

  // Try port 587 first (STARTTLS, most likely to be allowed)
  let result = await trySendGmail({ to, subject, html }, 587, false);
  if (result) return result;

  // Try port 465 (SSL)
  result = await trySendGmail({ to, subject, html }, 465, true);
  if (result) return result;

  // Fallback to SendGrid
  console.log('[Mail] Gmail failed, trying SendGrid...');
  return await sendViaSendGrid({ to, subject, html });
}

module.exports = { sendMail };