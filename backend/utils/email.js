/**
 * Email Utility
 * Uses Gmail SMTP with IPv4 forced (Render blocks IPv6 but allows IPv4 on port 465).
 * Falls back to SendGrid API.
 */

const nodemailer = require('nodemailer');
const https = require('https');
const dns = require('dns');

function cleanAppPassword(pass) {
  if (!pass) return '';
  return String(pass).replace(/\s+/g, '').trim();
}

/**
 * Resolve smtp.gmail.com to an IPv4 address
 */
function resolveSmtpHost() {
  return new Promise((resolve, reject) => {
    dns.resolve4('smtp.gmail.com', (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses[0]); // Use first IPv4 address
    });
  });
}

/**
 * Try sending via Gmail SMTP with IPv4
 */
async function sendViaGmail({ to, subject, html }) {
  const user = process.env.EMAIL_USER;
  const pass = cleanAppPassword(process.env.EMAIL_PASS);

  if (!user || !pass) {
    console.log('[Gmail] No credentials configured');
    return null;
  }

  try {
    // Resolve smtp.gmail.com to IPv4 address to avoid IPv6 routing issues
    const smtpIp = await resolveSmtpHost();
    console.log(`[Gmail] Resolved smtp.gmail.com to ${smtpIp}`);

    const transporter = nodemailer.createTransport({
      host: smtpIp,
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: {
        servername: 'smtp.gmail.com', // Required for TLS with IP address
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM || 'Child Vaccination System'}" <${user}>`,
      to,
      subject,
      html,
    });

    console.log(`[Gmail] Sent to ${to}: ${info.messageId}`);
    return { success: true, method: 'gmail' };
  } catch (err) {
    console.error(`[Gmail] Failed: ${err.code} - ${err.message}`);
    return null;
  }
}

/**
 * Fallback: Send via SendGrid HTTPS API
 */
async function sendViaSendGrid({ to, subject, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { success: false, error: 'No email method available' };

  const data = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: {
      email: process.env.EMAIL_USER || 'ogarishelton@gmail.com',
      name: process.env.EMAIL_FROM || 'Child Vaccination System',
    },
    subject,
    content: [{ type: 'text/html', value: html }],
    // Add tracking settings to help with deliverability
    tracking_settings: {
      open_tracking: { enable: true },
      click_tracking: { enable: true },
    },
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.sendgrid.com',
        path: '/v3/mail/send',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 20000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[SendGrid] Accepted to ${to}`);
            resolve({ success: true, method: 'sendgrid' });
          } else {
            console.error(`[SendGrid] Error ${res.statusCode}: ${body}`);
            resolve({ success: false, error: `SendGrid ${res.statusCode}` });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
    req.write(data);
    req.end();
  });
}

/**
 * Send email - tries Gmail SMTP (IPv4) first, then SendGrid
 */
async function sendMail({ to, subject, html }) {
  if (!to) return { success: false, error: 'No recipient' };

  // Try Gmail SMTP with IPv4 first
  const gmailResult = await sendViaGmail({ to, subject, html });
  if (gmailResult) return gmailResult;

  // Fallback to SendGrid
  console.log('[Mail] Gmail failed, trying SendGrid...');
  return await sendViaSendGrid({ to, subject, html });
}

module.exports = { sendMail };