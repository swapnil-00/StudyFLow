// test/whatsapp-manual.test.js — Unit tests for WhatsApp Manual Helper
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const whatsappManual = require('../js/services/whatsapp-manual.js');

describe('whatsappManual.normalizePhone', () => {
  test('prefixes 10-digit Indian numbers with 91', () => {
    assert.equal(whatsappManual.normalizePhone('9876543210'), '919876543210');
    assert.equal(whatsappManual.normalizePhone('8765432109'), '918765432109');
  });

  test('handles +91, spaces, dashes, parentheses and dots', () => {
    assert.equal(whatsappManual.normalizePhone('+91 98765 43210'), '919876543210');
    assert.equal(whatsappManual.normalizePhone('+91-98765-43210'), '919876543210');
    assert.equal(whatsappManual.normalizePhone('+91 (987) 654-3210'), '919876543210');
    assert.equal(whatsappManual.normalizePhone('98765.43210'), '919876543210');
  });

  test('strips leading 0 for 11-digit numbers', () => {
    assert.equal(whatsappManual.normalizePhone('09876543210'), '919876543210');
  });

  test('preserves valid international numbers (10 to 15 digits)', () => {
    assert.equal(whatsappManual.normalizePhone('+1 415 555 2671'), '14155552671');
    assert.equal(whatsappManual.normalizePhone('+44 20 7123 4567'), '442071234567');
  });

  test('returns null for invalid phone numbers', () => {
    assert.equal(whatsappManual.normalizePhone(''), null);
    assert.equal(whatsappManual.normalizePhone(null), null);
    assert.equal(whatsappManual.normalizePhone(undefined), null);
    assert.equal(whatsappManual.normalizePhone('12345'), null); // too short
    assert.equal(whatsappManual.normalizePhone('abcdefghij'), null); // non-digits
    assert.equal(whatsappManual.normalizePhone('12345678901234567'), null); // >15 digits
  });
});

describe('whatsappManual.buildLink', () => {
  test('builds web mode link correctly', () => {
    const link = whatsappManual.buildLink('9876543210', 'Hello World', 'web');
    assert.equal(link, 'https://web.whatsapp.com/send?phone=919876543210&text=Hello%20World');
  });

  test('builds app mode link correctly', () => {
    const link = whatsappManual.buildLink('9876543210', 'Hello World', 'app');
    assert.equal(link, 'https://wa.me/919876543210?text=Hello%20World');
  });

  test('properly encodes emojis, ₹, newlines, &, ?, and special characters', () => {
    const text = 'Hello Rahul! 🎉\nYour fee of ₹1,500 is due & payable? Yes!';
    const link = whatsappManual.buildLink('9876543210', text, 'web');
    
    assert.ok(link.startsWith('https://web.whatsapp.com/send?phone=919876543210&text='));
    const encodedPart = link.replace('https://web.whatsapp.com/send?phone=919876543210&text=', '');
    assert.equal(decodeURIComponent(encodedPart), text);
  });
});

describe('whatsappManual.renderMessage', () => {
  test('substitutes placeholders correctly', () => {
    const rendered = whatsappManual.renderMessage('seat_assigned', {
      student_name: 'Amit Patel',
      seat_number: 'B-07',
      room_name: 'Quiet Hall',
      branch_name: 'StudyFlow Apex',
      plan_name: 'Full Day',
      start_date: '01 Oct 2026',
      end_date: '31 Oct 2026',
      amount: '1,800',
      payment_status: 'Paid'
    }, {
      whatsappSignature: '— Apex Reading Lounge, 9876543210'
    });

    assert.ok(rendered.includes('Hello Amit Patel'));
    assert.ok(rendered.includes('Seat: B-07 (Quiet Hall, StudyFlow Apex)'));
    assert.ok(rendered.includes('Validity: 01 Oct 2026 to 31 Oct 2026'));
    assert.ok(rendered.includes('Amount: ₹1,800 (Paid)'));
    assert.ok(rendered.includes('— Apex Reading Lounge, 9876543210'));
  });

  test('every default template renders without leftover placeholders, blank gaps or "undefined"', () => {
    const vars = {
      student_name: 'Amit Patel', seat_number: 'B-07', room_name: 'Quiet Hall', branch_name: 'Main Branch', plan_name: 'Monthly',
      start_date: '01 Oct 2026', end_date: '31 Oct 2026', amount: '1,800', amount_due: '1,800', due_date: '03 Oct 2026', days_left: 3,
      payment_status: 'Paid', payment_mode: 'upi', date: '01 Oct 2026', receipt_number: 'REC-2026-000004', balance: '0',
      from_seat: 'A1', to_seat: 'B2', message: 'Library closed on Sunday.',
    };
    for (const key of Object.keys(whatsappManual.DEFAULT_TEMPLATES)) {
      const out = whatsappManual.renderMessage(key, vars, { orgName: 'Sharma Library', phone: '9876543210' });
      assert.ok(!/\{\{/.test(out), `${key}: unfilled placeholder in\n${out}`);
      assert.ok(!/undefined|null/.test(out), `${key}: undefined/null in output`);
      assert.ok(!/\n{3,}/.test(out), `${key}: triple blank line`);
      assert.ok(out.endsWith('— Sharma Library, 9876543210'), `${key}: signature missing`);
      if (key !== 'custom') assert.ok(out.startsWith('Hello Amit Patel,'), `${key}: greeting`);
    }
  });

  test('derives the library name, payment mode label, balance note and days-left wording', () => {
    const paid = whatsappManual.renderMessage('payment_received', {
      student_name: 'Priya', amount: 1200, payment_mode: 'bank_transfer', date: '06 Oct 2026', receipt_number: 'REC-2026-000009', balance: 0,
    }, { orgName: 'TN Library' });
    assert.ok(paid.includes('at TN Library'));
    assert.ok(paid.includes('Amount: ₹1,200'));
    assert.ok(paid.includes('Mode: Bank transfer'));
    assert.ok(paid.includes('No balance due. Your account is fully paid.'));
    assert.ok(!paid.includes('Balance due: ₹0'));

    const partial = whatsappManual.renderMessage('payment_received', { student_name: 'Priya', amount: '500', payment_mode: 'UPI', date: 'x', receipt_number: 'y', balance: '700' }, { orgName: 'TN Library' });
    assert.ok(partial.includes('Balance due: ₹700'));

    const today = whatsappManual.renderMessage('membership_expiring', { student_name: 'Priya', plan_name: 'Monthly', seat_number: '3', end_date: '06 Oct 2026', days_left: 0 }, { orgName: 'TN Library' });
    assert.ok(today.includes('ends today (06 Oct 2026)'));
    const soon = whatsappManual.renderMessage('membership_expiring', { student_name: 'Priya', plan_name: 'Monthly', seat_number: '3', end_date: '09 Oct 2026', days_left: '3' }, { orgName: 'TN Library' });
    assert.ok(soon.includes('ends in 3 days (09 Oct 2026)'));
  });

  test('the invoice line sits inside the message and an empty one leaves no gap', () => {
    const withLine = whatsappManual.renderMessage('seat_assigned', {
      student_name: 'Amit', seat_number: '1', room_name: 'Main Hall', branch_name: 'Main Branch', plan_name: 'Monthly',
      start_date: '06 Oct 2026', end_date: '05 Nov 2026', amount: '500', payment_status: 'Paid',
      invoice_line: 'Invoice INV-2026-000001 · Verify: https://example.test/#/verify?n=INV-2026-000001&c=AAAA-BBBB-CCCC',
    }, { orgName: 'TN Library' });
    assert.ok(withLine.includes('Amount: ₹500 (Paid)\nInvoice INV-2026-000001 · Verify: https://example.test/#/verify?n=INV-2026-000001&c=AAAA-BBBB-CCCC\n\nPlease keep this message'), withLine);
    const without = whatsappManual.renderMessage('seat_assigned', {
      student_name: 'Amit', seat_number: '1', room_name: 'Main Hall', branch_name: 'Main Branch', plan_name: 'Monthly',
      start_date: '06 Oct 2026', end_date: '05 Nov 2026', amount: '500', payment_status: 'Paid',
    }, { orgName: 'TN Library' });
    assert.ok(without.includes('Amount: ₹500 (Paid)\n\nPlease keep this message'), without);
  });

  test('handles missing variables gracefully without undefined', () => {
    const rendered = whatsappManual.renderMessage('payment_received', {
      student_name: 'Priya Sharma'
    }, {});

    assert.ok(rendered.includes('Hello Priya Sharma'));
    assert.ok(!rendered.includes('undefined'));
    assert.ok(!rendered.includes('null'));
  });

  test('uses custom org template if provided', () => {
    const customTpl = 'Custom invoice for {{student_name}}: Amount ₹{{amount}}';
    const rendered = whatsappManual.renderMessage('seat_assigned', {
      student_name: 'Neha Gupta',
      amount: '2,000'
    }, {
      whatsappTemplates: {
        seat_assigned: customTpl
      },
      whatsappSignature: '— My Library'
    });

    assert.ok(rendered.startsWith('Custom invoice for Neha Gupta: Amount ₹2,000'));
    assert.ok(rendered.includes('— My Library'));
  });

  test('caps rendered message at 1,500 characters', () => {
    const longText = 'A'.repeat(2000);
    const rendered = whatsappManual.renderMessage('custom', {
      message: longText
    }, {});

    assert.ok(rendered.length <= 1500);
  });
});

describe('WhatsApp opening modes', () => {
  test('desktop mode uses the WhatsApp Desktop app protocol (no browser tab)', () => {
    const link = whatsappManual.buildLink('98765 43210', 'Hi ₹1,500 & more?', 'desktop');
    assert.equal(link, 'whatsapp://send?phone=919876543210&text=Hi%20%E2%82%B91%2C500%20%26%20more%3F');
  });

  test('auto mode on a computer defaults to the desktop app; web and app modes stay available', () => {
    assert.ok(whatsappManual.buildLink('9876543210', 'Hi', 'auto').startsWith('whatsapp://send?phone=919876543210'));
    assert.equal(whatsappManual.buildLink('9876543210', 'Hi', 'web'), 'https://web.whatsapp.com/send?phone=919876543210&text=Hi');
    assert.equal(whatsappManual.buildLink('9876543210', 'Hi', 'app'), 'https://wa.me/919876543210?text=Hi');
  });
});
