// lib/audit.js — Centralized Server-Side Audit Logging (SEC-023)
'use strict';
const crypto = require('crypto');

/**
 * Strips sensitive data (passwords, tokens, secrets, full ID numbers) from metadata before storing.
 */
function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const cleaned = { ...meta };
  const sensitiveKeys = [
    'password', 'password_hash', 'currentPassword', 'newPassword',
    'token', 'accessToken', 'waToken', 'secret', 'apiKey', 'secretKey',
    'idProofNumber', 'id_proof'
  ];

  for (const key of Object.keys(cleaned)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      if (typeof cleaned[key] === 'string' && cleaned[key].length > 4) {
        cleaned[key] = `***${cleaned[key].slice(-4)}`;
      } else {
        cleaned[key] = '[REDACTED]';
      }
    } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      cleaned[key] = sanitizeMeta(cleaned[key]);
    }
  }
  return cleaned;
}

/**
 * Record an audit log entry within a PostgreSQL client/transaction.
 *
 * @param {Object} client       - pg client or pool with query() method
 * @param {Object} session      - Caller's verified session { userId, orgId, role }
 * @param {string} action       - e.g. 'seat.assign', 'payment.create', 'student.delete'
 * @param {string} entityType   - e.g. 'seat_assignments', 'payments', 'students'
 * @param {string} entityId     - ID of the entity affected
 * @param {Object} [meta={}]    - Safe contextual metadata
 */
async function audit(client, session, action, entityType, entityId, meta = {}) {
  try {
    const id = `AUD-${crypto.randomUUID()}`;
    const orgId = session?.orgId || 'SYSTEM';
    const userId = session?.userId || 'SYSTEM';
    const userRole = session?.role || 'unknown';
    const sanitizedMeta = sanitizeMeta(meta);

    // Ensure audit_logs table exists if running dynamically
    await client.query(
      `INSERT INTO audit_logs (id, organization_id, user_id, user_role, action, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [id, orgId, userId, userRole, action, entityType, entityId, JSON.stringify(sanitizedMeta)]
    );
  } catch (err) {
    // Audit logging failure inside transaction will bubble up to roll back the mutation,
    // ensuring audit integrity (cannot mutate without audit entry).
    console.error('Audit log write failed:', err.message);
    throw err;
  }
}

module.exports = {
  audit,
  sanitizeMeta,
};
