// test/plans.test.js — Central pricing & plan rules (lib/plans.js)
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const plans = require('../lib/plans');

describe('Plan pricing (lib/plans.js)', () => {
  test('Basic is 100 seats for ₹5,000 one-time', () => {
    const q = plans.quotePlan({ plan: 'basic' });
    assert.equal(q.ok, true);
    assert.deepEqual([q.plan, q.seats, q.subtotal, q.total, q.currency], ['basic', 100, 5000, 5000, 'INR']);
  });

  test('Custom price is proportional: seats / 100 × ₹5,000', () => {
    const expected = { 200: 10000, 300: 15000, 400: 20000, 500: 25000, 1000: 50000 };
    for (const [seats, price] of Object.entries(expected)) {
      const q = plans.quotePlan({ plan: 'custom', seats: Number(seats) });
      assert.equal(q.ok, true, `seats ${seats}`);
      assert.equal(q.total, price, `seats ${seats}`);
      assert.equal(q.seats, Number(seats));
    }
  });

  test('Custom accepts any whole number of seats above Basic, at the same per-seat rate', () => {
    const expected = { 101: 5050, 150: 7500, 250: 12500, 333: 16650, 5000: 250000 };
    for (const [seats, price] of Object.entries(expected)) {
      const q = plans.quotePlan({ plan: 'custom', seats: Number(seats) });
      assert.equal(q.ok, true, `seats ${seats}: ${q.error}`);
      assert.equal(q.total, price, `seats ${seats}`);
    }
    assert.equal(plans.quotePlan({ plan: 'custom', seats: '150' }).total, 7500, 'numeric strings from an input box work');
    assert.equal(plans.publicPricing().custom.pricePerSeat, 50);
  });

  test('Custom rejects 100 or fewer (that is Basic), more than 5,000, and non-whole numbers', () => {
    for (const bad of [100, 50, 0, -100, 6000, 'abc', 1.5, undefined, '', null]) {
      const q = plans.quotePlan({ plan: 'custom', seats: bad });
      assert.equal(q.ok, false, `seats ${bad} must be rejected`);
      assert.ok(q.error, 'has an error message');
    }
  });

  test('Free and Demo cannot be purchased; unknown plans are rejected', () => {
    assert.equal(plans.quotePlan({ plan: 'free' }).ok, false);
    assert.equal(plans.quotePlan({ plan: 'demo' }).ok, false);
    assert.equal(plans.quotePlan({ plan: 'platinum' }).ok, false);
  });

  test('Automatic-notification fee = seats × per-seat rate × months, only for 1/3/6/12 months', () => {
    const rate = plans.PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY;
    for (const m of plans.PRICING.AUTO_NOTIFY_PREPAY_MONTHS) {
      const q = plans.quoteAutoNotify({ seatLimit: 100, months: m });
      assert.equal(q.ok, true);
      assert.equal(q.monthly, 100 * rate);
      assert.equal(q.total, 100 * rate * m);
    }
    assert.equal(plans.quoteAutoNotify({ seatLimit: 200, months: 1 }).monthly, 200 * rate);
    assert.equal(plans.quoteAutoNotify({ seatLimit: 100, months: 2 }).ok, false);
    assert.equal(plans.quoteAutoNotify({ seatLimit: 0, months: 1 }).ok, false);
  });

  test('Tax is applied from config (0 today) and rounded', () => {
    const q = plans.quotePlan({ plan: 'basic' });
    assert.equal(q.taxPercent, plans.PRICING.TAX_PERCENT);
    assert.equal(q.tax, Math.round((q.subtotal * plans.PRICING.TAX_PERCENT) / 100));
  });
});

describe('Seat limits by plan', () => {
  test('Free is strictly 5 seats, even if the row says more', () => {
    assert.equal(plans.seatLimitFor({ plan: 'free', seat_limit: 100 }), 5);
    assert.equal(plans.seatLimitFor({ plan: 'free' }), 5);
    assert.equal(plans.seatLimitFor({}), 5);
    assert.equal(plans.seatLimitFor({ plan: 'trial', seat_limit: 75 }), 5, 'old trial rows become Free');
  });

  test('Basic is strictly 100 seats', () => {
    assert.equal(plans.seatLimitFor({ plan: 'basic', seat_limit: 250 }), 100);
    assert.equal(plans.seatLimitFor({ plan: 'basic' }), 100);
  });

  test('Custom, Demo and legacy paid plans use the purchased seat_limit', () => {
    assert.equal(plans.seatLimitFor({ plan: 'custom', seat_limit: 300 }), 300);
    assert.equal(plans.seatLimitFor({ plan: 'demo', seat_limit: 120 }), 120);
    assert.equal(plans.seatLimitFor({ plan: 'starter', seat_limit: 100 }), 100);
    assert.equal(plans.normalizePlanKey('enterprise'), 'custom');
    assert.equal(plans.seatLimitFor({ plan: 'custom' }), 100, 'missing seat_limit falls back safely');
  });

  test('Seat-limit messages tell the user how to proceed', () => {
    assert.equal(plans.seatLimitMessage('free', 5), 'Your free plan is limited to 5 seats. Please upgrade your subscription to add more members.');
    assert.match(plans.seatLimitMessage('basic', 100), /Custom plan/);
    assert.match(plans.seatLimitMessage('custom', 300), /300 seats/);
  });

  test('publicPricing exposes only numbers the client may see', () => {
    const p = plans.publicPricing();
    assert.equal(p.free.seats, 5);
    assert.equal(p.basic.price, 5000);
    assert.equal(p.custom.pricePerBlock, 5000);
    assert.deepEqual(p.autoNotify.prepayMonths, [1, 3, 6, 12]);
    assert.equal(JSON.stringify(p).includes('secret'), false);
  });

  test('formatINR uses Indian digit grouping', () => {
    assert.equal(plans.formatINR(5000), '₹5,000');
    assert.equal(plans.formatINR(50000), '₹50,000');
    assert.equal(plans.formatINR(1234567), '₹12,34,567');
    assert.equal(plans.formatINR(999), '₹999');
  });
});
