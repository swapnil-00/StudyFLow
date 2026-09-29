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
    assert.ok(rendered.includes('seat B-07 (Quiet Hall, StudyFlow Apex)'));
    assert.ok(rendered.includes('Amount: ₹1,800'));
    assert.ok(rendered.includes('— Apex Reading Lounge, 9876543210'));
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
