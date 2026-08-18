'use strict';

const BREVO_API_URL = 'https://api.brevo.com/v3';
const RESEND_API_URL = 'https://api.resend.com';

function send(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return send(res, 405, {
      error: 'Method not allowed.'
    });
  }

  // Brevo configuration.
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoListId = Number(process.env.BREVO_LIST_ID);

  // Resend configuration.
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendSegmentId = process.env.RESEND_SEGMENT_ID;

  // Keep Brevo as the primary subscription service.
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

  // Ignore automated spam submissions.
  if (website) {
    return send(res, 200, { ok: true });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim().slice(0, 80);

  // Validate the subscriber's email address.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return send(res, 400, {
      error: 'Enter a valid email address.'
    });
  }

  try {
    // 1. Add or update the subscriber in Brevo.
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

    // 2. Add the subscriber to Resend.
    if (resendApiKey && resendSegmentId) {
      try {
        const resendHeaders = {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        };

        const resendResponse = await fetch(`${RESEND_API_URL}/contacts`, {
          method: 'POST',

          headers: resendHeaders,

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
        } else {
          // 3. Trigger the Resend welcome-email automation.
          const eventResponse = await fetch(
            `${RESEND_API_URL}/events/send`,
            {
              method: 'POST',

              headers: resendHeaders,

              body: JSON.stringify({
                event: 'newsletter.subscribed',
                email: cleanEmail,

                payload: {
                  name: cleanName,
                  source: 'Techmin website'
                }
              })
            }
          );

          if (!eventResponse.ok) {
            const details = await eventResponse.json().catch(() => ({}));

            console.error(
              'Resend welcome automation error:',
              eventResponse.status,
              details
            );
          }
        }
      } catch (error) {
        console.error('Resend subscription or automation failed:', error);
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
