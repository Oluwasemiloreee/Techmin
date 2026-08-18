'use strict';

const BREVO_API_URL = 'https://api.brevo.com/v3';
const RESEND_API_URL = 'https://api.resend.com';

function send(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  // Allow newsletter subscriptions only through POST requests.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return send(res, 405, {
      error: 'Method not allowed.'
    });
  }

  // Existing Brevo configuration.
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoListId = Number(process.env.BREVO_LIST_ID);

  // New Resend configuration.
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendSegmentId = process.env.RESEND_SEGMENT_ID;

  // Brevo remains the primary subscription service.
  if (
    !brevoApiKey ||
    !Number.isInteger(brevoListId) ||
    brevoListId <= 0
  ) {
    return send(res, 503, {
      error: 'Newsletter service is not configured yet.'
    });
  }

  const { email = '', name = '', website = '' } = req.body || {};

  // Honeypot field: silently ignore automated spam submissions.
  if (website) {
    return send(res, 200, { ok: true });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim().slice(0, 80);

  // Confirm the email address has a valid format.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return send(res, 400, {
      error: 'Enter a valid email address.'
    });
  }

  try {
    // 1. Add or update the subscriber in your existing Brevo list.
    const brevoResponse = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',

      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },

      body: JSON.stringify({
        email: cleanEmail,

        attributes: cleanName
          ? { FIRSTNAME: cleanName }
          : undefined,

        listIds: [brevoListId],
        updateEnabled: true
      })
    });

    if (!brevoResponse.ok) {
      const details = await brevoResponse.json().catch(() => ({}));

      console.error(
        'Brevo subscribe error:',
        brevoResponse.status,
        details
      );

      return send(res, 502, {
        error: 'Subscription could not be completed. Please try again.'
      });
    }

    // 2. Add the same subscriber to Resend and the newsletter segment.
    //
    // Resend errors do not break the existing Brevo subscription flow.
    if (resendApiKey && resendSegmentId) {
      try {
        const resendResponse = await fetch(`${RESEND_API_URL}/contacts`, {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            email: cleanEmail,

            first_name: cleanName || undefined,

            unsubscribed: false,

            segments: [
              {
                id: resendSegmentId
              }
            ]
          })
        });

        if (!resendResponse.ok) {
          const details = await resendResponse.json().catch(() => ({}));

          console.error(
            'Resend subscribe error:',
            resendResponse.status,
            details
          );
        }
      } catch (error) {
        console.error('Resend subscription failed:', error);
      }
    } else {
      console.warn(
        'Resend subscription skipped: RESEND_API_KEY or RESEND_SEGMENT_ID is missing.'
      );
    }

    return send(res, 200, {
      ok: true,
      message: 'You are subscribed to Techmin.'
    });
  } catch (error) {
    console.error('Subscribe function failed:', error);

    return send(res, 500, {
      error: 'Subscription service is temporarily unavailable.'
    });
  }
};
