'use strict';

const BREVO_API_URL = 'https://api.brevo.com/v3';

function send(res, status, body) {
  res.status(status).json(body);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const recipient = process.env.CONTACT_TO_EMAIL;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Techmin Website';
  if (!apiKey || !recipient || !senderEmail) {
    return send(res, 503, { error: 'Contact service is not configured yet.' });
  }

  const { name = '', email = '', subject = '', message = '', website = '' } = req.body || {};
  if (website) return send(res, 200, { ok: true }); // honeypot

  const cleanName = String(name).trim().slice(0, 100);
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanSubject = String(subject).trim().slice(0, 140);
  const cleanMessage = String(message).trim().slice(0, 5000);

  if (!cleanName || !cleanSubject || cleanMessage.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return send(res, 400, { error: 'Complete all fields with a valid email and message.' });
  }

  const htmlContent = `
    <h2>New Techmin website message</h2>
    <p><strong>Name:</strong> ${escapeHtml(cleanName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</p>
    <hr>
    <p style="white-space:pre-wrap">${escapeHtml(cleanMessage)}</p>`;

  try {
    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipient, name: 'Techmin' }],
        replyTo: { email: cleanEmail, name: cleanName },
        subject: `[Techmin Contact] ${cleanSubject}`,
        htmlContent
      })
    });

    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      console.error('Brevo contact error:', response.status, details);
      return send(res, 502, { error: 'Your message could not be sent. Please try again.' });
    }

    return send(res, 200, { ok: true, message: 'Your message has been sent.' });
  } catch (error) {
    console.error('Contact function failed:', error);
    return send(res, 500, { error: 'Contact service is temporarily unavailable.' });
  }
};
