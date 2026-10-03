// lib/mailer.js — Transactional email delivery (Cloudflare Workers compatible).
//
// Workers cannot make raw SMTP/TCP connections (no net/tls modules), so this
// module sends exclusively via HTTP APIs:
//   RESEND_API_KEY  -> Resend HTTP API (recommended; verify your domain in Resend)
//   neither         -> outside production, log to the server console so local
//                      development still works; in production, throw, because
//                      silently dropping a reset mail is worse than an error.
//
// The owner should buy a domain, verify it in Resend, and add the Resend DNS
// records (SPF, DKIM, DMARC) in Cloudflare DNS. Sending from a verified domain
// fixes emails landing in spam.
'use strict';

const MAIL_FROM = process.env.MAIL_FROM || 'studyflowbusiness0@gmail.com';
const APP_NAME = process.env.APP_NAME || 'StudyFlow';

async function sendViaResend({ to, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend rejected the message (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json().catch(() => ({}));
  return { delivered: true, provider: 'resend', id: json.id || null };
}

async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: APP_NAME, email: MAIL_FROM.includes('<') ? MAIL_FROM.match(/<([^>]+)>/)?.[1] : MAIL_FROM },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo rejected the message (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json().catch(() => ({}));
  return { delivered: true, provider: 'brevo', id: json.messageId || null };
}

/**
 * Which provider sendMail will use.
 */
function activeProvider() {
  if (Boolean(process.env.BREVO_API_KEY)) return 'brevo';
  if (Boolean(process.env.RESEND_API_KEY)) return 'resend';
  return 'none';
}

/**
 * Send one transactional email.
 */
async function sendMail({ to, subject, text, html }) {
  if (!to) throw new Error('sendMail: "to" is required');
  const provider = activeProvider();

  if (provider === 'brevo') {
    return sendViaBrevo({ to, subject, text, html });
  }

  if (provider === 'resend') {
    return sendViaResend({ to, subject, text, html });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'No email provider configured. Set BREVO_API_KEY or RESEND_API_KEY in Cloudflare settings.'
    );
  }
  // Development fallback: make the content visible instead of pretending.
  console.warn(
    `[mailer] No provider configured; not sending. to=${to} subject="${subject}"\n${text}`
  );
  return { delivered: false, provider: 'console', id: null };
}

// No links in security emails: a code email from a free mailbox that links to a *.workers.dev
// address matches common phishing patterns, and Gmail filters or drops it. The code is all the
// recipient needs, since they type it into the page they already have open.
function wrapHtml(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7f9;
font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1d23">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
<h1 style="margin:0 0 16px;font-size:18px">${title}</h1>
${bodyHtml}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280">${APP_NAME} account security</p>
</div></body></html>`;
}

/** Reset code email. The code is the only secret; never include a password. */
async function sendPasswordResetCode({ to, code, minutes }) {
  // Plain, transactional wording: "password reset" phrasing in subjects is a common spam signal.
  const subject = `Your ${APP_NAME} verification code`;
  const text =
    `Hello,\n\nYour ${APP_NAME} verification code is:\n\n    ${code}\n\n` +
    `Enter it on the ${APP_NAME} page you have open. It expires in ${minutes} minutes ` +
    `and can be used once.\n\n` +
    `If you didn't ask for this code, you can ignore this email. Nothing on your ` +
    `account has changed.\n\nThe ${APP_NAME} team\n`;
  const html = wrapHtml(
    'Your verification code',
    `<p style="margin:0 0 16px">Hello,</p>
<p style="margin:0 0 16px">Your ${APP_NAME} verification code is:</p>
<p style="margin:0 0 16px;font-size:30px;font-weight:700;letter-spacing:5px">${code}</p>
<p style="margin:0 0 12px;font-size:14px;color:#4b5563">Enter it on the ${APP_NAME} page you
have open. It expires in ${minutes} minutes and can be used once.</p>
<p style="margin:0;font-size:14px;color:#4b5563">If you didn't ask for this code, you can ignore
this email. Nothing on your account has changed.</p>`
  );
  return sendMail({ to, subject, text, html });
}

/** Post-reset notification, so a victim of an account takeover finds out. */
async function sendPasswordChangedNotice({ to, ip, when }) {
  const subject = `${APP_NAME}: your password was changed`;
  const stamp = (when || new Date()).toISOString().replace('T', ' ').slice(0, 16);
  const text =
    `Your ${APP_NAME} password was changed on ${stamp} UTC` +
    `${ip ? ` from ${ip}` : ''}.\n\nAll other sessions were signed out.\n\n` +
    `If this was not you, reset your password again immediately and contact support.\n`;
  const html = wrapHtml(
    'Your password was changed',
    `<p style="margin:0 0 12px">Your ${APP_NAME} password was changed on
<strong>${stamp} UTC</strong>${ip ? ` from <strong>${ip}</strong>` : ''}.</p>
<p style="margin:0 0 12px;font-size:14px;color:#4b5563">All other sessions were signed out.</p>
<p style="margin:0;font-size:14px;color:#b42318">If this was not you, reset your password
again immediately and contact support.</p>`
  );
  return sendMail({ to, subject, text, html });
}

module.exports = {
  activeProvider,
  sendMail,
  sendPasswordResetCode,
  sendPasswordChangedNotice,
};
