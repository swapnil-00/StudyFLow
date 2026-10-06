// lib/coupons.js — Discount coupons for plan purchases (created in the Developer Lab)
//
// A coupon is a percentage off a quote. 100% makes the purchase free: the plan is applied
// immediately with no payment provider involved. Uses are counted when the purchase is
// finalized, so an abandoned checkout never burns a use.
'use strict';
const { query } = require('./db');
const { HttpError } = require('./errors');

const APPLIES_TO = Object.freeze(['any', 'plan', 'auto_notify']);

function normalizeCode(code) {
  const c = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9_-]{3,32}$/.test(c) ? c : null;
}

function mapCoupon(r) {
  if (!r) return null;
  return {
    code: r.code, percentOff: Number(r.percent_off), appliesTo: r.applies_to || 'any',
    maxUses: r.max_uses == null ? null : Number(r.max_uses), uses: Number(r.uses || 0),
    expiresAt: r.expires_at, active: r.active !== false, note: r.note || '', createdBy: r.created_by || null, createdAt: r.created_at,
  };
}

async function findCoupon(code, exec = query) {
  const c = normalizeCode(code);
  if (!c) return null;
  const res = await exec('SELECT * FROM coupons WHERE code = $1', [c]);
  return mapCoupon(res.rows[0]);
}

/**
 * Is this coupon usable right now for this kind of purchase?
 * @returns {{ ok: true, coupon } | { ok: false, code: string, error: string }}
 */
async function validateCoupon(code, kind, exec = query, now = new Date()) {
  const c = normalizeCode(code);
  if (!c) return { ok: false, code: 'COUPON_INVALID', error: 'Enter a valid coupon code.' };
  const coupon = await findCoupon(c, exec);
  if (!coupon || !coupon.active) return { ok: false, code: 'COUPON_INVALID', error: 'This coupon code is not valid.' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return { ok: false, code: 'COUPON_EXPIRED', error: 'This coupon has expired.' };
  if (coupon.maxUses != null && coupon.uses >= coupon.maxUses) return { ok: false, code: 'COUPON_EXHAUSTED', error: 'This coupon has already been used the maximum number of times.' };
  if (coupon.appliesTo !== 'any' && coupon.appliesTo !== kind) return { ok: false, code: 'COUPON_NOT_APPLICABLE', error: 'This coupon does not apply to this purchase.' };
  return { ok: true, coupon };
}

/** A quote from lib/plans with the coupon applied. Tax is recomputed on the discounted amount. */
function applyCoupon(quote, coupon) {
  const subtotal = Number(quote.subtotal);
  const discount = Math.min(subtotal, Math.round((subtotal * coupon.percentOff) / 100));
  const discounted = subtotal - discount;
  const tax = Math.round((discounted * (Number(quote.taxPercent) || 0)) / 100);
  return {
    ...quote,
    subtotalBeforeDiscount: subtotal,
    couponCode: coupon.code,
    percentOff: coupon.percentOff,
    discount,
    subtotal: discounted,
    tax,
    total: discounted + tax,
    description: `${quote.description} (coupon ${coupon.code}: ${coupon.percentOff}% off)`,
  };
}

/** Atomic: counts a use only if the coupon is still usable. */
async function consumeCoupon(code, exec = query) {
  const c = normalizeCode(code);
  if (!c) return false;
  const res = await exec(
    `UPDATE coupons SET uses = uses + 1, updated_at = CURRENT_TIMESTAMP
     WHERE code = $1 AND active = TRUE AND (max_uses IS NULL OR uses < max_uses)
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
     RETURNING code`,
    [c]
  );
  return res.rows.length > 0;
}

async function createCoupon({ code, percentOff, appliesTo = 'any', maxUses = null, expiresAt = null, note = '', createdBy = null }, exec = query) {
  const c = normalizeCode(code);
  if (!c) throw new HttpError(400, 'COUPON_INVALID', 'Coupon codes are 3–32 letters, digits, - or _ (e.g. SWAP100).');
  const pct = Number(percentOff);
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) throw new HttpError(400, 'INVALID_PERCENT', 'percentOff must be a whole number from 1 to 100.');
  if (!APPLIES_TO.includes(appliesTo)) throw new HttpError(400, 'INVALID_APPLIES_TO', `appliesTo must be one of ${APPLIES_TO.join(', ')}.`);
  let max = null;
  if (maxUses != null && maxUses !== '') {
    max = Number(maxUses);
    if (!Number.isInteger(max) || max < 1) throw new HttpError(400, 'INVALID_MAX_USES', 'maxUses must be a whole number of at least 1, or empty for unlimited.');
  }
  let exp = null;
  if (expiresAt) {
    exp = new Date(expiresAt);
    if (Number.isNaN(exp.getTime())) throw new HttpError(400, 'INVALID_EXPIRY', 'expiresAt is not a valid date.');
  }
  const res = await exec(
    `INSERT INTO coupons (code, percent_off, applies_to, max_uses, expires_at, active, note, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7)
     ON CONFLICT (code) DO NOTHING
     RETURNING *`,
    [c, pct, appliesTo, max, exp ? exp.toISOString() : null, String(note || '').slice(0, 200), createdBy]
  );
  if (res.rows.length === 0) throw new HttpError(409, 'COUPON_EXISTS', `Coupon ${c} already exists.`);
  return mapCoupon(res.rows[0]);
}

async function listCoupons(exec = query) {
  const res = await exec('SELECT * FROM coupons ORDER BY created_at DESC LIMIT 200', []);
  return res.rows.map(mapCoupon);
}

async function setCouponActive(code, active, exec = query) {
  const c = normalizeCode(code);
  if (!c) throw new HttpError(400, 'COUPON_INVALID', 'Invalid coupon code.');
  const res = await exec('UPDATE coupons SET active = $2, updated_at = CURRENT_TIMESTAMP WHERE code = $1 RETURNING *', [c, Boolean(active)]);
  if (res.rows.length === 0) throw new HttpError(404, 'COUPON_NOT_FOUND', 'Coupon not found.');
  return mapCoupon(res.rows[0]);
}

module.exports = { APPLIES_TO, normalizeCode, findCoupon, validateCoupon, applyCoupon, consumeCoupon, createCoupon, listCoupons, setCouponActive };
