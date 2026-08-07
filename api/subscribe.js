'use strict';

const BREVO_API_URL = 'https://api.brevo.com/v3';

function send(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) {
    return send(res, 503, { error: 'Newsletter service is not configured yet.' });
  }

  const { email = '', name = '', website = '' } = req.body || {};
  if (website) return send(res, 200, { ok: true }); // honeypot

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return send(res, 400, { error: 'Enter a valid email address.' });
  }

  try {
    const response = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: cleanEmail,
        attributes: cleanName ? { FIRSTNAME: cleanName } : undefined,
        listIds: [listId],
        updateEnabled: true
      })
    });

    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      console.error('Brevo subscribe error:', response.status, details);
      return send(res, 502, { error: 'Subscription could not be completed. Please try again.' });
    }

    return send(res, 200, { ok: true, message: 'You are subscribed to Techmin.' });
  } catch (error) {
    console.error('Subscribe function failed:', error);
    return send(res, 500, { error: 'Subscription service is temporarily unavailable.' });
  }
};
