// test/mailer.test.js — email provider selection (no emails are actually sent)
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const MAILER = path.join(__dirname, '..', 'lib', 'mailer.js');

function loadMailer(env) {
  const keys = ['BREVO_API_KEY', 'RESEND_API_KEY', 'MAIL_FROM', 'NODE_ENV'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, env);
  delete require.cache[require.resolve(MAILER)];
  const mailer = require(MAILER);
  return {
    mailer,
    restore: () => {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  };
}

describe('Email provider selection', () => {
  test('Brevo key present → uses Brevo (preferred provider)', () => {
    const { mailer, restore } = loadMailer({ BREVO_API_KEY: 'xkeysib-test', RESEND_API_KEY: 're_test' });
    try {
      assert.equal(mailer.activeProvider(), 'brevo');
    } finally {
      restore();
    }
  });

  test('Only Resend key present → uses Resend', () => {
    const { mailer, restore } = loadMailer({ RESEND_API_KEY: 're_test' });
    try {
      assert.equal(mailer.activeProvider(), 'resend');
    } finally {
      restore();
    }
  });

  test('No keys configured → returns none', () => {
    const { mailer, restore } = loadMailer({});
    try {
      assert.equal(mailer.activeProvider(), 'none');
    } finally {
      restore();
    }
  });

  test('In production with no keys → sendMail throws configuration error', async () => {
    const { mailer, restore } = loadMailer({ NODE_ENV: 'production' });
    try {
      assert.equal(mailer.activeProvider(), 'none');
      await assert.rejects(
        () => mailer.sendMail({ to: 'user@example.com', subject: 'Test', text: 'Hello' }),
        /No email provider configured/
      );
    } finally {
      restore();
    }
  });

  test('In non-production with no keys → sendMail logs warning and returns console provider', async () => {
    const { mailer, restore } = loadMailer({ NODE_ENV: 'development' });
    try {
      assert.equal(mailer.activeProvider(), 'none');
      const res = await mailer.sendMail({ to: 'user@example.com', subject: 'Test', text: 'Hello' });
      assert.deepEqual(res, { delivered: false, provider: 'console', id: null });
    } finally {
      restore();
    }
  });
});
