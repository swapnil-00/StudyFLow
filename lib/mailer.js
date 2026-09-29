// lib/mailer.js — Transactional email delivery.
//
// The password-reset flow generated a code and told the user it had been sent,
// but nothing in the project ever sent an email. This is that missing layer.
//
// Providers are chosen from the environment, so no code change is needed to
// switch one on:
//   RESEND_API_KEY   -> Resend HTTP API (no dependency, works on Vercel)
//   SMTP_URL         -> SMTP via nodemailer, only if nodemailer is installed
//   neither          -> outside production, log to the server console so local
//                       development still works; in production, throw, because
//                       silently dropping a reset mail is worse than an error.
'use strict';

const MAIL_FROM = process.env.MAIL_FROM || 'StudyFlow <onboarding@resend.dev>';
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

async function sendViaSmtp({ to, subject, text, html }) {
  let nodemailer;
  try {
    // Optional dependency: only required when SMTP_URL is configured.
    nodemailer = require('nodemailer');
  } catch (_err) {
    throw new Error(
      'SMTP_URL is set but nodemailer is not installed. Run "npm i nodemailer" ' +
        'or use RESEND_API_KEY instead.'
    );
  }
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  const info = await transport.sendMail({ from: MAIL_FROM, to, subject, text, html });
  return { delivered: true, provider: 'smtp', id: info.messageId || null };
}

/**
 * Send one transactional email.
 *
 * Resolves to { delivered, provider, id }. `delivered` is false only for the
 * development console fallback, so callers can tell a real send from a log.
 * Throws if a configured provider fails, or if production has no provider.
 */
async function sendMail({ to, subject, text, html }) {
  if (!to) throw new Error('sendMail: "to" is required');
  if (process.env.RESEND_API_KEY) return sendViaResend({ to, subject, text, html });
  if (process.env.SMTP_URL) return sendViaSmtp({ to, subject, text, html });

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'No email provider configured. Set RESEND_API_KEY (recommended) or ' +
        'SMTP_URL so account emails can be delivered.'
    );
  }
  // Development fallback: make the content visible instead of pretending.
  console.warn(
    `[mailer] No provider configured; not sending. to=${to} subject="${subject}"\n${text}`
  );
  return { delivered: false, provider: 'console', id: null };
}

// No links in security emails: a code email from a free mailbox that links to a *.vercel.app
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
  const subject = `${APP_NAME}: your password reset code`;
  const text =
    `Use this code to reset your ${APP_NAME} password:\n\n    ${code}\n\n` +
    `It expires in ${minutes} minutes and can be used once.\n\n` +
    `If you did not request this, you can ignore this email — your password ` +
    `has not been changed.\n`;
  const html = wrapHtml(
    'Reset your password',
    `<p style="margin:0 0 16px">Use this code to reset your ${APP_NAME} password:</p>
<p style="margin:0 0 16px;font-size:30px;font-weight:700;letter-spacing:5px">${code}</p>
<p style="margin:0;font-size:14px;color:#4b5563">It expires in ${minutes} minutes and
can be used once. If you did not request this, ignore this email — your password has
not been changed.</p>`
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
  sendMail,
  sendPasswordResetCode,
  sendPasswordChangedNotice,
};
