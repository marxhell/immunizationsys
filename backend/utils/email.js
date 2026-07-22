/**
 * Email Utility
 * Uses EmailJS API (HTTPS) to send emails — works on all platforms including Render.
 * No SMTP needed. Free tier: 200 emails/month.
 *
 * Setup:
 * 1. Create template at https://www.emailjs.com with variables: to_name, child_name, appointment_date
 * 2. Add these env vars to Render:
 *    EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PRIVATE_KEY
 */

const https = require('https');

async function sendMail({ to, subject, html }) {
  const publicKey = process.env.EMAILJS_PUBLIC_KEY || 'g2De6HyCLxXs5H_Cu';
  const privateKey = process.env.EMAILJS_PRIVATE_KEY || 'eK7XQvUUONGBweuZHOZVK';
  const serviceId = process.env.EMAILJS_SERVICE_ID || 'service_h08feqy';
  const templateId = process.env.EMAILJS_TEMPLATE_ID || 'template_coqj5l9';

  if (!publicKey || !serviceId || !templateId) {
    return { success: false, error: 'EmailJS not configured' };
  }

  // Extract child name and date from the HTML (simple parsing)
  let toName = 'Parent';
  let childName = 'your child';
  let appointmentDate = 'soon';

  // Try to extract from HTML content
  const nameMatch = html.match(/Hello ([^<,]+)/i);
  if (nameMatch) toName = nameMatch[1].trim();

  const childMatch = html.match(/for ([^<]+) has/i) || html.match(/([^<]+) has a vaccination/i);
  if (childMatch) childName = childMatch[1].trim();

  const dateMatch = html.match(/on ([^<.]+)/i);
  if (dateMatch) appointmentDate = dateMatch[1].trim();

  const data = JSON.stringify({
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_name: toName,
      to_email: to,
      child_name: childName,
      appointment_date: appointmentDate,
      subject: subject,
      message: html.replace(/<[^>]*>/g, '').substring(0, 500),
    },
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.emailjs.com',
        path: '/api/v1.0/email/send',
        method: 'POST',
        headers: {
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
            console.log(`[EmailJS] Sent to ${to}: ${body}`);
            resolve({ success: true, method: 'emailjs' });
          } else {
            console.error(`[EmailJS] Error ${res.statusCode}: ${body}`);
            resolve({ success: false, error: `EmailJS ${res.statusCode}: ${body}` });
          }
        });
      }
    );
    req.on('error', (e) => {
      console.error(`[EmailJS] Network error: ${e.message}`);
      resolve({ success: false, error: e.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'EmailJS timeout' });
    });
    req.write(data);
    req.end();
  });
}

module.exports = { sendMail };