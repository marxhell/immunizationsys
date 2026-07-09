/**
 * Email Utility
 * Uses Brevo (formerly Sendinblue) HTTPS API — works on all cloud platforms.
 * No SMTP ports needed. Brevo free tier: 300 emails/day.
 */

const https = require('https');

async function sendMail({ to, subject, html }) {
  if (!to) return { success: false, error: 'No recipient' };

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    // Fallback to SendGrid if available
    if (process.env.SENDGRID_API_KEY) {
      return sendViaSendGrid({ to, subject, html });
    }
    return { success: false, error: 'Set BREVO_API_KEY in Render env vars. Get it from https://app.brevo.com/settings/keys/api' };
  }

  const fromEmail = process.env.EMAIL_USER || 'ogarishelton@gmail.com';
  const fromName = process.env.EMAIL_FROM || 'Child Vaccination System';

  const data = JSON.stringify({
    sender: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Brevo] Sent to ${to}: ${body}`);
            resolve({ success: true, method: 'brevo', messageId: body });
          } else {
            console.error(`[Brevo] Error ${res.statusCode}: ${body}`);
            resolve({ success: false, error: `Brevo ${res.statusCode}: ${body}` });
          }
        });
      }
    );
    req.on('error', (e) => {
      console.error(`[Brevo] Network error: ${e.message}`);
      resolve({ success: false, error: e.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Brevo API timeout' });
    });
    req.write(data);
    req.end();
  });
}

/**
 * Fallback: Send via SendGrid HTTPS API
 */
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
    req.write(data);
    req.end();
  });
}

module.exports = { sendMail };