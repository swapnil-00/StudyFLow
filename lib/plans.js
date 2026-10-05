// lib/plans.js — Central plan & pricing configuration (single source of truth)
//
// Every rupee amount, seat limit and plan rule lives here. api/*, scripts/* and the
// client (via client_config → pricing) read from this module; nothing else hard-codes
// a price or a seat count. Change a number here and every screen, limit check and
// quote follows.
'use strict';

const PRICING = Object.freeze({
  currency: 'INR',

  // Free plan: what every self-created library starts with.
  FREE_SEAT_LIMIT: 5,

  // Paid base plan: a one-time price for a block of seats.
  BASE_SEATS: 100,
  BASE_PRICE: 5000,

  // Custom plans are sold in whole blocks of CUSTOM_SEAT_STEP seats, priced pro rata
  // to the base plan: price = seats / BASE_SEATS × BASE_PRICE. 100 seats is the Basic
  // plan, so Custom starts at the next block.
  CUSTOM_SEAT_STEP: 100,
  CUSTOM_MIN_SEATS: 200,
  CUSTOM_MAX_SEATS: 5000,

  // Automatic WhatsApp notifications add-on: ₹ per seat of plan capacity per month,
  // prepaid for 1, 3, 6 or 12 months. Derivation: SUBSCRIPTION_IMPLEMENTATION.md §5.
  AUTO_NOTIFY_PER_SEAT_MONTHLY: 10,
  AUTO_NOTIFY_PREPAY_MONTHS: Object.freeze([1, 3, 6, 12]),

  // GST added on top of the listed prices. 0 until the business is GST-registered.
  TAX_PERCENT: 0,
});

// Plan catalogue. `seatLimit: null` means the limit comes from the purchase (organizations.seat_limit).
const PLANS = Object.freeze({
  free:   Object.freeze({ key: 'free',   name: 'Free',   paid: false, purchasable: false, seatLimit: PRICING.FREE_SEAT_LIMIT, price: 0 }),
  basic:  Object.freeze({ key: 'basic',  name: 'Basic',  paid: true,  purchasable: true,  seatLimit: PRICING.BASE_SEATS,      price: PRICING.BASE_PRICE }),
  custom: Object.freeze({ key: 'custom', name: 'Custom', paid: true,  purchasable: true,  seatLimit: null,                    price: null }),
  demo:   Object.freeze({ key: 'demo',   name: 'Demo',   paid: true,  purchasable: false, seatLimit: PRICING.BASE_SEATS,      price: 0 }),
});

// Plan names that existed before this pricing model. They were all paid tiers, so they
// behave like a Custom plan with whatever seat_limit the row already has.
const LEGACY_PAID_PLANS = new Set(['starter', 'growth', 'enterprise', 'pro']);

function normalizePlanKey(raw) {
  const key = String(raw || '').toLowerCase().trim();
  if (PLANS[key]) return key;
  if (LEGACY_PAID_PLANS.has(key)) return 'custom';
  return 'free'; // includes the old 'trial' plan and anything unknown
}

/** The plan definition for an organization row (or anything with .plan). */
function planFor(org) {
  return PLANS[normalizePlanKey(org && org.plan)];
}

/**
 * The seat limit the server enforces for an organization row.
 * Free and Basic are strict (the row's seat_limit cannot grant extra seats); Custom, Demo
 * and legacy plans use the row's seat_limit, which the purchase or admin script set.
 */
function seatLimitFor(org) {
  const plan = planFor(org);
  if (plan.key === 'free') return PRICING.FREE_SEAT_LIMIT;
  if (plan.key === 'basic') return PRICING.BASE_SEATS;
  const stored = Number(org && org.seat_limit);
  if (Number.isInteger(stored) && stored > 0) return stored;
  return plan.seatLimit || PRICING.BASE_SEATS;
}

/** Indian digit grouping: 1234567 → 12,34,567 */
function formatINR(amount) {
  const n = Math.round(Number(amount) || 0);
  const sign = n < 0 ? '-' : '';
  const s = String(Math.abs(n));
  if (s.length <= 3) return `${sign}₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${sign}₹${rest},${last3}`;
}

function customPriceFor(seats) {
  return (seats / PRICING.BASE_SEATS) * PRICING.BASE_PRICE;
}

/** Custom seat quantities must be whole blocks within the allowed range. */
function validateCustomSeats(value) {
  const seats = Number(value);
  if (!Number.isInteger(seats)) {
    return { ok: false, error: 'Enter a whole number of seats.' };
  }
  if (seats % PRICING.CUSTOM_SEAT_STEP !== 0) {
    return { ok: false, error: `Seats are sold in blocks of ${PRICING.CUSTOM_SEAT_STEP}. Choose ${PRICING.CUSTOM_MIN_SEATS}, ${PRICING.CUSTOM_MIN_SEATS + PRICING.CUSTOM_SEAT_STEP}, ${PRICING.CUSTOM_MIN_SEATS + 2 * PRICING.CUSTOM_SEAT_STEP}…` };
  }
  if (seats < PRICING.CUSTOM_MIN_SEATS) {
    return { ok: false, error: `Custom plans start at ${PRICING.CUSTOM_MIN_SEATS} seats. For ${PRICING.BASE_SEATS} seats choose the Basic plan.` };
  }
  if (seats > PRICING.CUSTOM_MAX_SEATS) {
    return { ok: false, error: `The maximum is ${PRICING.CUSTOM_MAX_SEATS} seats. Contact StudyFlow for larger libraries.` };
  }
  return { ok: true, seats };
}

function withTax(subtotal) {
  const tax = Math.round((subtotal * PRICING.TAX_PERCENT) / 100);
  return { subtotal, taxPercent: PRICING.TAX_PERCENT, tax, total: subtotal + tax, currency: PRICING.currency };
}

/**
 * Price a plan purchase. Returns { ok:false, error } for anything that cannot be bought.
 * @param {{ plan: string, seats?: number }} input
 */
function quotePlan({ plan, seats } = {}) {
  const key = String(plan || '').toLowerCase();
  if (key === 'basic') {
    return {
      ok: true, kind: 'plan', plan: 'basic', seats: PRICING.BASE_SEATS,
      description: `Basic plan — ${PRICING.BASE_SEATS} seats (one-time)`,
      ...withTax(PRICING.BASE_PRICE),
    };
  }
  if (key === 'custom') {
    const v = validateCustomSeats(seats);
    if (!v.ok) return { ok: false, error: v.error };
    return {
      ok: true, kind: 'plan', plan: 'custom', seats: v.seats,
      description: `Custom plan — ${v.seats} seats (one-time)`,
      ...withTax(customPriceFor(v.seats)),
    };
  }
  if (PLANS[key]) return { ok: false, error: `The ${PLANS[key].name} plan cannot be purchased.` };
  return { ok: false, error: 'Unknown plan.' };
}

/**
 * Price the automatic WhatsApp notifications add-on for a plan's seat capacity.
 * @param {{ seatLimit: number, months: number }} input
 */
function quoteAutoNotify({ seatLimit, months } = {}) {
  const seats = Number(seatLimit);
  const m = Number(months);
  if (!Number.isInteger(seats) || seats <= 0) return { ok: false, error: 'Invalid seat capacity.' };
  if (!PRICING.AUTO_NOTIFY_PREPAY_MONTHS.includes(m)) {
    return { ok: false, error: `Choose ${PRICING.AUTO_NOTIFY_PREPAY_MONTHS.join(', ')} months.` };
  }
  const monthly = seats * PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY;
  return {
    ok: true, kind: 'auto_notify', seats, months: m,
    perSeatMonthly: PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY, monthly,
    description: `Automatic WhatsApp notifications — ${seats} seats × ${formatINR(PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY)}/seat × ${m} month${m === 1 ? '' : 's'}`,
    ...withTax(monthly * m),
  };
}

/** Message shown when a library tries to add a seat beyond its plan. */
function seatLimitMessage(planKey, limit) {
  switch (normalizePlanKey(planKey)) {
    case 'free':
      return `Your free plan is limited to ${limit} seats. Please upgrade your subscription to add more members.`;
    case 'basic':
      return `Your Basic plan includes ${limit} seats. Upgrade to a Custom plan to add more seats.`;
    case 'demo':
      return `The demo library is limited to ${limit} seats.`;
    default:
      return `You've used all ${limit} seats in your plan. Upgrade your seat plan to add more.`;
  }
}

/**
 * Feature flags. The automatic WhatsApp add-on is ON HOLD until the WhatsApp sender is set
 * up: while AUTO_NOTIFY_ENABLED is not "true" it cannot be bought, switched on or shown.
 */
function isAutoNotifyEnabled(env = process.env) {
  return String(env.AUTO_NOTIFY_ENABLED || '').toLowerCase() === 'true';
}

function featureFlags(env = process.env) {
  return { autoNotify: isAutoNotifyEnabled(env) };
}

/** The numbers the client needs to display prices. No secrets, safe to send to anyone. */
function publicPricing() {
  return {
    currency: PRICING.currency,
    taxPercent: PRICING.TAX_PERCENT,
    free: { seats: PRICING.FREE_SEAT_LIMIT, price: 0 },
    basic: { seats: PRICING.BASE_SEATS, price: PRICING.BASE_PRICE },
    custom: {
      step: PRICING.CUSTOM_SEAT_STEP,
      minSeats: PRICING.CUSTOM_MIN_SEATS,
      maxSeats: PRICING.CUSTOM_MAX_SEATS,
      pricePerBlock: PRICING.BASE_PRICE,
      blockSeats: PRICING.BASE_SEATS,
    },
    autoNotify: {
      perSeatMonthly: PRICING.AUTO_NOTIFY_PER_SEAT_MONTHLY,
      prepayMonths: [...PRICING.AUTO_NOTIFY_PREPAY_MONTHS],
    },
  };
}

module.exports = {
  PRICING,
  PLANS,
  normalizePlanKey,
  planFor,
  seatLimitFor,
  formatINR,
  customPriceFor,
  validateCustomSeats,
  quotePlan,
  quoteAutoNotify,
  seatLimitMessage,
  publicPricing,
  isAutoNotifyEnabled,
  featureFlags,
};
