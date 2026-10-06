// lib/platform-admin.js — Who may open the Developer Lab (platform-wide admin console)
//
// Membership is by Google-verified email, not by any flag a user could set. The default
// list is the platform owner; PLATFORM_ADMIN_EMAILS (comma-separated) overrides it.
'use strict';
const { HttpError } = require('./errors');

const DEFAULT_PLATFORM_ADMINS = Object.freeze(['srchaudhari324@gmail.com']);

function adminEmails(env = process.env) {
  const raw = env.PLATFORM_ADMIN_EMAILS;
  const list = raw && raw.trim() ? raw.split(',') : DEFAULT_PLATFORM_ADMINS;
  return new Set(list.map(e => String(e).trim().toLowerCase()).filter(Boolean));
}

function isPlatformAdmin(email, env = process.env) {
  if (!email) return false;
  return adminEmails(env).has(String(email).trim().toLowerCase());
}

function requirePlatformAdmin(session) {
  if (!session || !isPlatformAdmin(session.email)) {
    throw new HttpError(403, 'FORBIDDEN', 'The Developer Lab is restricted to the platform owner.');
  }
}

module.exports = { DEFAULT_PLATFORM_ADMINS, adminEmails, isPlatformAdmin, requirePlatformAdmin };
