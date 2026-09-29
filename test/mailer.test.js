// test/mailer.test.js — email provider selection (no emails are actually sent)
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const MAILER = path.join(__dirname, '..', 'lib', 'mailer.js');

function loadMailer(env) {
  const keys = ['RESEND_API_KEY', 'SMTP_URL', 'MAIL_FROM', 'EMAIL_PROVIDER'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, env);
  delete require.cache[require.resolve(MAILER)];
  const mailer = require(MAILER);
  return { mailer, restore: () => { for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } } };
}

const SMTP = 'smtps://sender%40gmail.com:xxxxxxxxxxxxxxxx@smtp.gmail.com:465';

describe('Email provider selection', () => {
  test('Gmail sender + SMTP + leftover RESEND_API_KEY → uses SMTP (Resend cannot send from gmail.com)', () => {
    const { mailer, restore } = loadMailer({ RESEND_API_KEY: 're_test', SMTP_URL: SMTP, MAIL_FROM: 'StudyFlow <sender@gmail.com>' });
    try { assert.equal(mailer.activeProvider(), 'smtp'); } finally { restore(); }
  });

  test('Own-domain sender + Resend + SMTP → uses Resend', () => {
    const { mailer, restore } = loadMailer({ RESEND_API_KEY: 're_test', SMTP_URL: SMTP, MAIL_FROM: 'StudyFlow <no-reply@studyflow.in>' });
    try { assert.equal(mailer.activeProvider(), 'resend'); } finally { restore(); }
  });

  test('Only SMTP → SMTP; only Resend → Resend; nothing → none', () => {
    let l = loadMailer({ SMTP_URL: SMTP, MAIL_FROM: 'StudyFlow <sender@gmail.com>' });
    try { assert.equal(l.mailer.activeProvider(), 'smtp'); } finally { l.restore(); }
    l = loadMailer({ RESEND_API_KEY: 're_test', MAIL_FROM: 'StudyFlow <no-reply@studyflow.in>' });
    try { assert.equal(l.mailer.activeProvider(), 'resend'); } finally { l.restore(); }
    l = loadMailer({});
    try { assert.equal(l.mailer.activeProvider(), 'none'); } finally { l.restore(); }
  });

  test('EMAIL_PROVIDER forces the choice when that provider is configured', () => {
    let l = loadMailer({ RESEND_API_KEY: 're_test', SMTP_URL: SMTP, MAIL_FROM: 'StudyFlow <no-reply@studyflow.in>', EMAIL_PROVIDER: 'smtp' });
    try { assert.equal(l.mailer.activeProvider(), 'smtp'); } finally { l.restore(); }
    l = loadMailer({ SMTP_URL: SMTP, MAIL_FROM: 'StudyFlow <sender@gmail.com>', EMAIL_PROVIDER: 'resend' });
    try { assert.equal(l.mailer.activeProvider(), 'smtp', 'falls back when forced provider is not configured'); } finally { l.restore(); }
  });
});
