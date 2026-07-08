/**
 * Email Utility
 * Uses SendGrid API (HTTPS) to send emails. Works on all cloud platforms
 * including Render free tier (which blocks SMTP ports 25, 465, 587).
 *
 * For this to work, add ONE environment variable in Render:
 *   SENDGRID_API_KEY = your_sendgrid_api_key_here
 *
 * Also verify ogarishelton@gmail.com as a Single Sender in SendGrid.
 */

const https = require('https');

/**
 * Send email via SendGrid HTTPS API
 */
async function sendMail({ to, subject, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not configured. Set it in Render Environment Variables.');
    return { success: false, error: 'SENDGRID_API_KEY not configured' };
  }

  if (!to) {
    console.warn('No recipient email provided; skipping');
    return { success: false, error: 'No recipient email' };
  }

  const fromEmail = 'ogarishelton@gmail.com'; // Verified sender in SendGrid
  const fromName = process.env.EMAIL_FROM || 'Child Vaccination System';

  const data = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: fromName },
    subject: subject,
    content: [{ type: 'text/html', value: html }],
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.sendgrid.com',
        path: '/v3/mail/send',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Email sent to ${to} via SendGrid`);
            resolve({ success: true });
          } else {
            console.error(`SendGrid error (${res.statusCode}): ${body}`);
            resolve({ success: false, error: `SendGrid API error: ${res.statusCode} - ${body}` });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('SendGrid request error:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'SendGrid timeout' });
    });

    req.write(data);
    req.end();
  });
}

module.exports = { sendMail };